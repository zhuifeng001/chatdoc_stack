'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-23 23:22:47
LastEditors: longsion
LastEditTime: 2024-10-14 15:43:33
'''
from pkg.es.es_doc_table import DocTableES, DocTableModel
from pkg.es.es_doc_fragment import DocFragmentES, DocFragmentModel
from pkg.embedding.acge_embedding import get_similar_top_n
from pkg.es.es_file import ESFileObject
from pkg.es.es_p_doc_fragment import PDocFragmentES, PDocFragmentModel
from pkg.es.es_p_doc_table import PDocTableES, PDocTableModel
from pkg.es.es_p_file import PESFileObject
from pkg.utils import edit_distance
from pkg.utils.logger import logger
from pkg.utils.decorators import register_span_func
from pkg.structure_static import match_fixed_tables, three_table_key_list
from pkg.config import config
from pkg.global_.objects import Context, GlobalQAType
from pkg.utils.thread_with_return_value import ThreadWithReturnValue


def lambda_func(context: Context):

    return context.model_dump(include=[
        "params",
        "trace_id",
        "question_analysis",
        "fixed_table_retrieve_small",
        "normal_table_retrieve_small",
        "fragment_retrieve_small",
    ])


def retrieve_small_by_analyst(context: Context) -> Context:
    # 如果文件存在
    document_uuids = list(set([file.uuid for file in context.locationfiles if isinstance(file, ESFileObject)]))
    if not document_uuids:
        document_uuids = list(set([file.uuid for file in context.files if isinstance(file, ESFileObject)]))

    # 三大表召回
    context.fixed_table_retrieve_small = retrieve_by_fixed_table(context, document_uuids)
    fixed_table_file_uuids = [cur.uuid for cur in context.fixed_table_retrieve_small]

    # 文件三大表召回到了之后之后其他的召回就省略掉
    document_uuids = list(set(document_uuids) - set(fixed_table_file_uuids))

    _normal_table_retrieve_t, _paragraph_retrieve_t = None, None
    if document_uuids:
        _normal_table_retrieve_t = ThreadWithReturnValue(target=retrieve_by_table, args=(context, document_uuids))
        _normal_table_retrieve_t.start()

        _paragraph_retrieve_t = ThreadWithReturnValue(target=retrieve_by_paragraph, args=(context, document_uuids))
        _paragraph_retrieve_t.start()

        context.normal_table_retrieve_small += _normal_table_retrieve_t.join()
        context.fragment_retrieve_small += _paragraph_retrieve_t.join()

    return context


def retrieve_small_by_personal(context: Context) -> Context:
    # 如果文件存在
    document_uuids = list(set([file.uuid for file in context.locationfiles if isinstance(file, PESFileObject)]))
    if not document_uuids:
        document_uuids = list(set([file.uuid for file in context.files if isinstance(file, PESFileObject)]))

    _normal_table_retrieve_t, _paragraph_retrieve_t = None, None
    if document_uuids:
        _normal_table_retrieve_t = ThreadWithReturnValue(target=retrieve_by_personal_table, args=(context, document_uuids))
        _normal_table_retrieve_t.start()

        _paragraph_retrieve_t = ThreadWithReturnValue(target=retrieve_by_personal_paragraph, args=(context, document_uuids))
        _paragraph_retrieve_t.start()

        context.normal_table_retrieve_small += _normal_table_retrieve_t.join()
        context.fragment_retrieve_small += _paragraph_retrieve_t.join()

    return context


@register_span_func(func_name="多路召回", span_export_func=lambda context: lambda_func(context))
def retrieve_small(context: Context) -> Context:

    if context.params.qa_type == GlobalQAType.ANALYST.value:
        context = retrieve_small_by_analyst(context)
    elif context.params.qa_type == GlobalQAType.PERSONAL.value:
        context = retrieve_small_by_personal(context)
    else:
        personal_t = ThreadWithReturnValue(target=retrieve_small_by_personal, args=(context,))
        personal_t.start()
        context = retrieve_small_by_analyst(context)
        context = personal_t.join()

    return context


def retrieve_by_fixed_table(context: Context, document_uuids: list[str]) -> list[DocTableModel]:
    empty_list = []
    if len(context.question_analysis.keywords) != 1:
        logger.warning(f"Fixed Table Agent 仅限于关键词数量为1，keywords: {context.question_analysis.model_dump()}")
        return empty_list

    keyword = context.question_analysis.keywords[0]
    # """语义匹配top1"""
    top1 = get_similar_top_n(three_table_key_list, keyword)
    if not top1:
        logger.warning(f"Fixed Table Agent 匹配不到关键词对应的表格，keyword: {keyword}")
        return empty_list

    vector_similarly = edit_distance_similarly = float(config["retrieve"]["fixed_table_keyword_threshold"])
    table_keyword, score = top1[0]

    if score < vector_similarly:
        logger.warning(f'similar_score: {score} < fixed_table_keyword_threshold: {float(vector_similarly)}')
        return empty_list

    edit_distance_score = 1 - edit_distance(table_keyword, keyword) / max(len(table_keyword), len(keyword))
    if edit_distance_score < edit_distance_similarly:
        logger.warning(f'edit_distance_score: {edit_distance_score} < fixed_table_keyword_threshold: {edit_distance_similarly}')
        return empty_list

    titles = match_fixed_tables(table_keyword)
    doc_table_items = DocTableES().search_fixed_tables(titles, document_uuids, table_keyword)
    # 固定表召回过滤
    doc_table_items = [doc_table_item
                       for doc_table_item in doc_table_items if doc_table_item.uuid in
                       [locationfile.uuid for locationfile in context.locationfiles]]
    return doc_table_items


def retrieve_by_table(context: Context, document_uuids: list[str]) -> list[DocTableModel]:
    # 表格召回
    files = [
        file for file in context.locationfiles if isinstance(file, ESFileObject)
    ]
    if files:
        size = min(4 * len(files), 10)
    else:
        size = 10
    doc_table_items: list[DocTableModel] = []
    threads = []
    for keyword in context.question_analysis.keywords:
        t = ThreadWithReturnValue(target=DocTableES().search_table, kwargs=dict(bm25_text=keyword,
                                                                                ebd_text=context.question_analysis.retrieve_question if document_uuids != [] else context.params.question,
                                                                                document_uuids=document_uuids,
                                                                                size=size))
        t.start()
        threads.append(t)

    for t in threads:
        doc_table_items.extend(t.join())
    return doc_table_items


def retrieve_by_paragraph(context: Context, document_uuids: list[str]) -> list[DocFragmentModel]:
    # 段落召回
    files = [
        file for file in context.locationfiles if isinstance(file, ESFileObject)
    ]
    if files:
        size = min(20 * len(files), 25)
    else:
        size = 25
    doc_fragment_items: list[DocFragmentModel] = DocFragmentES().search_fragment(bm25_text=context.question_analysis.retrieve_question if document_uuids != [] else context.params.question,
                                                                                 ebd_text=context.question_analysis.retrieve_question if document_uuids != [] else context.params.question,
                                                                                 document_uuids=document_uuids,
                                                                                 size=size)
    return doc_fragment_items


def retrieve_by_personal_table(context: Context, document_uuids: list[str]) -> list[PDocTableModel]:
    # 表格召回
    files = [
        file for file in context.locationfiles if isinstance(file, PESFileObject)
    ]
    if files:
        size = min(4 * len(files), 10)
    else:
        size = 10

    doc_table_items: list[PDocTableModel] = []
    threads = []
    for keyword in context.question_analysis.keywords:
        t = ThreadWithReturnValue(target=PDocTableES().search_table, kwargs=dict(bm25_text=keyword,
                                                                                 ebd_text=context.question_analysis.retrieve_question if document_uuids != [] else context.params.question,
                                                                                 document_uuids=document_uuids,
                                                                                 user_id=context.params.user_id,
                                                                                 size=size,
                                                                                 ))
        t.start()
        threads.append(t)

    for t in threads:
        doc_table_items.extend(t.join())
    return doc_table_items


def retrieve_by_personal_paragraph(context: Context, document_uuids: list[str]) -> list[PDocFragmentModel]:
    # 段落召回
    files = [
        file for file in context.locationfiles if isinstance(file, PESFileObject)
    ]
    if files:
        size = min(20 * len(files), 25)
    else:
        size = 25
    doc_fragment_items: list[PDocFragmentModel] = PDocFragmentES().search_fragment(bm25_text=context.question_analysis.retrieve_question if document_uuids != [] else context.params.question,
                                                                                   ebd_text=context.question_analysis.retrieve_question if document_uuids != [] else context.params.question,
                                                                                   user_id=context.params.user_id,
                                                                                   document_uuids=document_uuids,
                                                                                   size=size,
                                                                                   )
    return doc_fragment_items
