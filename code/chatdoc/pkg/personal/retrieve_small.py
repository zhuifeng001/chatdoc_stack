'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-23 23:22:47
LastEditors: longsion
LastEditTime: 2024-10-16 14:13:33
'''
import json
from pkg.es.es_p_doc_table import PDocTableES, PDocTableModel
from pkg.es.es_p_doc_fragment import PDocFragmentES, PDocFragmentModel
from pkg.embedding.acge_embedding import get_similar_top_n
from pkg.utils import edit_distance
from pkg.utils.decorators import register_span_func
from pkg.structure_static import match_fixed_tables, three_table_key_list
from pkg.config import config
from pkg.personal.objects import Context
from pkg.personal.common import fillin_fragment_children_cache, fillin_doc_items_cache
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.utils.logger import logger


def lambda_func(context: Context):

    return context.model_dump(include=[
        "params",
        "trace_id",
        "question_analysis",
        "fixed_table_retrieve_small",
        "normal_table_retrieve_small",
        "fragment_retrieve_small",
    ])


@register_span_func(func_name="多路召回", span_export_func=lambda context: lambda_func(context))
def retrieve_small(context: Context) -> Context:

    document_uuids = list(set([file.uuid for file in context.files]))

    # 三大表召回
    _fixed_table_retrieve_t = ThreadWithReturnValue(target=retrieve_by_fixed_table, args=(context, document_uuids,))
    _fixed_table_retrieve_t.start()

    # 更新 fragment cache 以及 doc item cache
    fill_fragments_cache(context)

    context.fixed_table_retrieve_small = _fixed_table_retrieve_t.join()

    fixed_table_file_uuids = [cur.uuid for cur in context.fixed_table_retrieve_small]

    # 文件三大表召回到了之后之后其他的召回就省略掉
    document_uuids = list(set(document_uuids) - set(fixed_table_file_uuids))

    _normal_table_retrieve_t, _paragraph_retrieve_t = None, None
    if document_uuids:
        _normal_table_retrieve_t = ThreadWithReturnValue(target=retrieve_by_table, args=(context, document_uuids))
        _normal_table_retrieve_t.start()

        _paragraph_retrieve_t = ThreadWithReturnValue(target=retrieve_by_paragraph, args=(context, document_uuids))
        _paragraph_retrieve_t.start()

        context.normal_table_retrieve_small = _normal_table_retrieve_t.join()
        context.fragment_retrieve_small = _paragraph_retrieve_t.join()

    # 填充子切片cache及ori_item的cache，方便后续步骤使用
    table_ori_ids = [
        (table_item.uuid, ori_id) for table_item in context.normal_table_retrieve_small + context.fixed_table_retrieve_small for ori_id in table_item.ori_id
    ]
    para_ori_ids = fillin_fragment_children_cache(context.fragment_cache, context.fragment_retrieve_small)
    fillin_doc_items_cache(context.doc_items_cache, context.params.user_id, list(set(table_ori_ids + para_ori_ids)))

    return context


def fill_fragments_cache(context: Context):
    # 从doc_fragments_json中更新 context.fragment_cache
    for file in context.files:
        if file.doc_fragments_json:
            doc_fragments = json.loads(file.doc_fragments_json)
            if isinstance(doc_fragments, list):
                # without embeddings
                doc_fragments = [
                    PDocFragmentModel(**fragment, file_uuid=file.uuid) for fragment in doc_fragments
                ]
                context.fragment_cache.update({doc_fragment.uuid: doc_fragment for doc_fragment in doc_fragments})


def retrieve_by_fixed_table(context: Context, document_uuids: list[str]) -> list[PDocTableModel]:
    empty_list = []
    if len(context.question_analysis.keywords) != 1:
        logger.info(f"Fixed Table Agent 仅限于关键词数量为1，keywords: {context.question_analysis.model_dump()}")
        return empty_list

    keyword = context.question_analysis.keywords[0]
    # """语义匹配top1"""
    top1 = get_similar_top_n(three_table_key_list, keyword)
    if not top1:
        logger.info(f"Fixed Table Agent 匹配不到关键词对应的表格，keyword: {keyword}")
        return empty_list

    vector_similarly = edit_distance_similarly = float(config["retrieve"]["fixed_table_keyword_threshold"])
    table_keyword, score = top1[0]

    if score < vector_similarly:
        logger.info(f'similar_score: {score} < fixed_table_keyword_threshold: {float(vector_similarly)}')
        return empty_list

    edit_distance_score = 1 - edit_distance(table_keyword, keyword) / max(len(table_keyword), len(keyword))
    if edit_distance_score < edit_distance_similarly:
        logger.info(f'edit_distance_score: {edit_distance_score} < fixed_table_keyword_threshold: {edit_distance_similarly}')
        return empty_list

    titles = match_fixed_tables(table_keyword)
    doc_table_items = PDocTableES().search_fixed_tables(titles, context.params.user_id, document_uuids, table_keyword)
    # 固定表召回过滤
    doc_table_items = [doc_table_item
                       for doc_table_item in doc_table_items if doc_table_item.uuid in
                       [locationfile.uuid for locationfile in context.locationfiles]]
    return doc_table_items


def retrieve_by_table(context: Context, document_uuids: list[str]) -> list[PDocTableModel]:
    # 表格召回
    doc_table_items: list[PDocTableModel] = []

    threads = []
    for keyword in context.question_analysis.keywords:
        t = ThreadWithReturnValue(target=PDocTableES().search_table, kwargs=dict(bm25_text=keyword, ebd_text=context.question_analysis.retrieve_question, user_id=context.params.user_id, document_uuids=document_uuids, size=min(5 * len(context.files), 200)))
        t.start()
        threads.append(t)

    for t in threads:
        doc_table_items.extend(t.join())
    # 表格召回过滤
    if len(context.locationfiles) < 4:
        doc_table_items = [doc_table_item
                           for doc_table_item in doc_table_items if doc_table_item.uuid in
                           [locationfile.uuid for locationfile in context.locationfiles]]
    else:
        doc_table_items = doc_table_items[0:min(3 * len(context.files), 100)]
    return doc_table_items


def retrieve_by_paragraph(context: Context, document_uuids: list[str]) -> list[PDocFragmentModel]:
    # 段落召回
    doc_fragment_items: list[PDocFragmentModel] = PDocFragmentES().search_fragment(bm25_text=context.question_analysis.retrieve_question, ebd_text=context.question_analysis.retrieve_question, user_id=context.params.user_id, document_uuids=document_uuids, size=min(15 * len(context.files), 300))
    # 段落召回过滤
    if len(context.locationfiles) < 4:
        doc_fragment_items: list[PDocFragmentModel] = [doc_fragment_item
                                                       for doc_fragment_item in doc_fragment_items if doc_fragment_item.file_uuid in
                                                       [locationfile.uuid for locationfile in context.locationfiles]]
    else:
        doc_fragment_items: list[PDocFragmentModel] = doc_fragment_items[0:min(8 * len(context.files), 150)]
    return doc_fragment_items
