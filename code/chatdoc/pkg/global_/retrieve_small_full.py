'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-10-08 16:11:24
LastEditors: longsion
LastEditTime: 2024-10-08 19:17:02
'''

import re
from difflib import get_close_matches
from pkg.es.es_doc_table import DocTableES, DocTableModel
from pkg.es.es_doc_fragment import DocFragmentES, DocFragmentModel
from pkg.es.es_file import ESFileObject
from pkg.es.es_p_doc_fragment import PDocFragmentES, PDocFragmentModel
from pkg.es.es_p_doc_table import PDocTableES, PDocTableModel
from pkg.es.es_p_file import PESFileObject
from pkg.utils.decorators import register_span_func
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


def retrieve_small_full_by_analyst(context: Context) -> Context:
    document_uuids = []
    # 没有选中文件时，进行全局检索，只使用段落召回与表格召回
    _normal_table_retrieve_l = ThreadWithReturnValue(target=retrieve_by_table, args=(context, document_uuids))
    _normal_table_retrieve_l.start()

    _paragraph_retrieve_l = ThreadWithReturnValue(target=retrieve_by_paragraph, args=(context, document_uuids))
    _paragraph_retrieve_l.start()

    normal_table_retrieve_small = _normal_table_retrieve_l.join()
    fragment_retrieve_small = _paragraph_retrieve_l.join()

    # 过滤召回内容
    files = [file for file in context.locationfiles]
    if files:
        filter_uuids = list(set([file.uuid for file in files]))
        normal_table_retrieve_small = [r for r in normal_table_retrieve_small if r.uuid not in filter_uuids]
        fragment_retrieve_small = [r for r in fragment_retrieve_small if r.file_uuid not in filter_uuids]
        if context.question_analysis.companies:
            garbage = ["股份有限公司", "有限公司", "招股说明书", "招股书", "年度报告", "季度报告", "季报"]
            compare_key_infos = []
            for k in context.question_analysis.companies + [context.params.question]:  # 原问题也作为匹配条件
                for g in garbage:
                    k = k.replace(g, "")
                k = re.sub(r'\d{4}年', "", k)
                compare_key_infos.append(k)
            normal_table_retrieve_small = [r for r in normal_table_retrieve_small if
                                           get_ebed(r.ebed_text, compare_key_infos)]
            fragment_retrieve_small = [r for r in fragment_retrieve_small if
                                       get_ebed(r.ebed_text, compare_key_infos)]
    context.normal_table_retrieve_small += normal_table_retrieve_small
    context.fragment_retrieve_small += fragment_retrieve_small

    return context


def retrieve_small_full_by_personal(context: Context) -> Context:
    # 如果文件存在
    document_uuids = []
    # 没有选中文件时，进行全局检索，只使用段落召回与表格召回
    _normal_table_retrieve_l = ThreadWithReturnValue(target=retrieve_by_personal_table, args=(context, document_uuids))
    _normal_table_retrieve_l.start()

    _paragraph_retrieve_l = ThreadWithReturnValue(target=retrieve_by_personal_paragraph, args=(context, document_uuids))
    _paragraph_retrieve_l.start()

    normal_table_retrieve_small = _normal_table_retrieve_l.join()
    fragment_retrieve_small = _paragraph_retrieve_l.join()

    # 过滤召回内容
    files = [file for file in context.locationfiles]
    if files:
        filter_uuids = list(set([file.uuid for file in files]))
        normal_table_retrieve_small = [r for r in normal_table_retrieve_small if r.uuid not in filter_uuids]
        fragment_retrieve_small = [r for r in fragment_retrieve_small if r.file_uuid not in filter_uuids]
        if context.question_analysis.companies:
            garbage = ["股份有限公司", "有限公司", "招股说明书", "招股书", "年度报告", "季度报告", "季报"]
            compare_key_infos = []
            for k in context.question_analysis.companies + [context.params.question]:  # 原问题也作为匹配条件
                for g in garbage:
                    k = k.replace(g, "")
                k = re.sub(r'\d{4}年', "", k)
                compare_key_infos.append(k)
            normal_table_retrieve_small = [r for r in normal_table_retrieve_small if
                                           get_ebed(r.ebed_text, compare_key_infos)]
            fragment_retrieve_small = [r for r in fragment_retrieve_small if
                                       get_ebed(r.ebed_text, compare_key_infos)]
    context.normal_table_retrieve_small += normal_table_retrieve_small
    context.fragment_retrieve_small += fragment_retrieve_small

    return context


@register_span_func(func_name="多路召回Full", span_export_func=lambda context: lambda_func(context))
def retrieve_small_full(context: Context) -> Context:
    if context.params.qa_type == GlobalQAType.ANALYST.value:
        context = retrieve_small_full_by_analyst(context)
    elif context.params.qa_type == GlobalQAType.PERSONAL.value:
        context = retrieve_small_full_by_personal(context)
    else:
        personal_t = ThreadWithReturnValue(target=retrieve_small_full_by_personal, args=(context,))
        personal_t.start()
        context = retrieve_small_full_by_analyst(context)
        context = personal_t.join()

    return context


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
                                                                                 size=size,
                                                                                 user_id=context.params.user_id))
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
                                                                                   document_uuids=document_uuids,
                                                                                   size=size,
                                                                                   user_id=context.params.user_id)
    return doc_fragment_items


def get_ebed(text, key_infos):
    """
    hard_rule: 判断某段文本中是否存在关键信息（此处关键信息为定位到的公司名）
    step0: 如果text直接与key_infos匹配，则表明定位到的段落全部为公司名信息，无用
    step1: 先将该段文本按照标点拆分,没有表标点的按照字长切分
    step2: 将拆分后的文本与关键信息比对
    """
    # step0
    if get_close_matches(text, key_infos, cutoff=0.8):
        return False
    # step1
    pattern = r'[。！!？?，,]'
    text_list_span = re.split(pattern, text)
    text_list_span = [item for item in text_list_span if item.strip()]
    if len(text_list_span) == 1:
        text_list_span = [text[i:i + 20] for i in range(0, len(text), 20)]
    # step2:
    for t in text_list_span:
        matches = get_close_matches(t, key_infos, cutoff=0.3)
        if matches:
            return True
        else:
            continue
    return False
