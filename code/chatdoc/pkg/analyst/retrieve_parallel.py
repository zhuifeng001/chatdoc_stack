'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-27 17:50:27
LastEditors: longsion
LastEditTime: 2024-10-16 14:16:58
'''
import json

import requests
from pkg.analyst.common import fillin_doc_items_cache, fillin_fragment_children_cache
from pkg.analyst.objects import Context
from pkg.embedding.acge_embedding import get_similar_top_n
from pkg.es.es_doc_table import DocTableES, DocTableModel
from pkg.es.es_doc_fragment import DocFragmentES, DocFragmentModel
from pkg.utils import edit_distance
from pkg.utils.decorators import register_span_func
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.structure_static import match_fixed_tables, three_table_key_list
from pkg.config import config
from pkg.utils.logger import logger

import pypeln as pl


def func_span(context: Context):

    return dict(
        params=context.params.model_dump(),
        question_analysis=context.question_analysis.model_dump(),
        document_retrieve=[
            dict(
                retrieval_type=retrieve_context.retrieval_type.value,
                ori_id=retrieve_context.ori_ids,
                texts=retrieve_context.texts,
                uuid=retrieve_context.uuid
            )
            for retrieve_context in context.rerank_retrieve_before_qa
        ],
    )


@register_span_func(func_name="并行召回", span_export_func=func_span)
def retrieve_parallel(context: Context) -> Context:
    document_uuids = [file.uuid for file in context.files]
    fill_fragments_cache(context)

    context.rerank_retrieve_before_qa = []

    # 使用 Proxy 去请求单个
    request_bodys = [
        dict(
            question_analysis=context.question_analysis.model_dump(),
            other_params=dict(
                fixed_table_keyword_threshold=float(config["retrieve"]["fixed_table_keyword_threshold"]),
                uuid=uuid
            )
        ) for uuid in document_uuids
    ]

    proxy_url = config["proxy"]["url"]
    # proxy_url = "http://localhost:8000"
    responses = request_bodys | pl.thread.map(
        lambda body: requests.post(f"{proxy_url}/retrieve/small", json=body).json(), workers=len(request_bodys), maxsize=len(request_bodys)
    ) | list

    responses = [response for response in responses if "error" not in response]

    for response in responses:
        if "error" in response:
            continue
        fixed_table_retrieve_small = [DocTableModel.from_hit(each) for each in response["fixed_table_retrieve_small"]]
        normal_table_retrieve_small = [DocTableModel.from_hit(each) for each in response["normal_table_retrieve_small"]]
        fragment_retrieve_small = [DocFragmentModel.from_hit(each) for each in response["fragment_retrieve_small"]]

        context.fixed_table_retrieve_small.extend(fixed_table_retrieve_small)
        context.normal_table_retrieve_small.extend(normal_table_retrieve_small)
        context.fragment_retrieve_small.extend(fragment_retrieve_small)

    # 填充子切片cache及ori_item的cache，方便后续步骤使用
    table_ori_ids = [
        (table_item.uuid, ori_id) for table_item in context.normal_table_retrieve_small + context.fixed_table_retrieve_small for ori_id in table_item.ori_id
    ]
    para_ori_ids = fillin_fragment_children_cache(context.fragment_cache, context.fragment_retrieve_small)
    fillin_doc_items_cache(context.doc_items_cache, list(set(table_ori_ids + para_ori_ids)))

    return context

    # threads = []
    # for document_uuid in list(set(document_uuids)):
    #     thread = ThreadWithReturnValue(target=retrieve_small_by_document, args=(context, document_uuid))
    #     thread.start()
    #     threads.append(thread)

    # for thread in threads:
    #     fixed_table_retrieve_small, normal_table_retrieve_small, fragment_retrieve_small = thread.join()
    #     context.fixed_table_retrieve_small.extend(fixed_table_retrieve_small)
    #     context.normal_table_retrieve_small.extend(normal_table_retrieve_small)
    #     context.fragment_retrieve_small.extend(fragment_retrieve_small)

    # return context


def fill_fragments_cache(context: Context):
    # 从doc_fragments_json中更新 context.fragment_cache
    for file in context.files:
        if file.doc_fragments_json:
            doc_fragments = json.loads(file.doc_fragments_json)
            if isinstance(doc_fragments, list):
                # without embeddings
                doc_fragments = [
                    DocFragmentModel(**fragment, file_uuid=file.uuid) for fragment in doc_fragments
                ]
                context.fragment_cache.update({doc_fragment.uuid: doc_fragment for doc_fragment in doc_fragments})


def retrieve_small_by_document(context: Context, uuid: str):

    document_uuids = [uuid]
    # 三大表召回
    fixed_table_retrieve_small = retrieve_by_fixed_table(context, document_uuids)
    fixed_table_file_uuids = [cur.uuid for cur in fixed_table_retrieve_small]

    # 文件三大表召回到了之后之后其他的召回就省略掉
    document_uuids = list(set(document_uuids) - set(fixed_table_file_uuids))
    if document_uuids:
        _normal_table_retrieve_t = ThreadWithReturnValue(target=retrieve_by_table, args=(context, document_uuids))
        _normal_table_retrieve_t.start()

        _paragraph_retrieve_t = ThreadWithReturnValue(target=retrieve_by_paragraph, args=(context, document_uuids))
        _paragraph_retrieve_t.start()

        normal_table_retrieve_small = _normal_table_retrieve_t.join()
        fragment_retrieve_small = _paragraph_retrieve_t.join()

    else:
        normal_table_retrieve_small = []
        fragment_retrieve_small = []

    # 填充子切片cache及ori_item的cache，方便后续步骤使用
    table_ori_ids = [
        (table_item.uuid, ori_id) for table_item in normal_table_retrieve_small + fixed_table_retrieve_small for ori_id in table_item.ori_id
    ]
    para_ori_ids = fillin_fragment_children_cache(context.fragment_cache, fragment_retrieve_small)
    fillin_doc_items_cache(context.doc_items_cache, list(set(table_ori_ids + para_ori_ids)))
    return fixed_table_retrieve_small, normal_table_retrieve_small, fragment_retrieve_small


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

    return doc_table_items


def retrieve_by_table(context: Context, document_uuids: list[str]) -> list[DocTableModel]:
    # 表格召回
    doc_table_items: list[DocTableModel] = []

    for keyword in context.question_analysis.keywords:
        doc_table_items.extend(
            DocTableES().search_table(bm25_text=keyword, ebd_text=context.question_analysis.retrieve_question, document_uuids=document_uuids)
        )

    return doc_table_items


def retrieve_by_paragraph(context: Context, document_uuids: list[str]) -> list[DocFragmentModel]:
    # 段落召回
    doc_fragment_items: list[DocFragmentModel] = DocFragmentES().search_fragment(bm25_text=context.question_analysis.retrieve_question, ebd_text=context.question_analysis.retrieve_question, document_uuids=document_uuids, size=20)

    return doc_fragment_items
