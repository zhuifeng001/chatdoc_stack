'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-06 14:57:34
LastEditors: longsion
LastEditTime: 2024-06-20 22:02:19
'''

from collections import Counter, OrderedDict
from pkg.analyst.common import get_fragment_all_texts, get_fragment_ori_ids, get_fragment_ori_text, get_table_ori_text
from pkg.analyst.objects import Context, RetrieveContext, RetrieveType
from pkg.config import config
from pkg.es.es_doc_fragment import DocFragmentModel
from pkg.es.es_doc_table import DocTableModel
from pkg.rerank import rerank_api_by_cache
from pkg.utils import duplicates_list, softmax, split_list
from pkg.utils.decorators import register_span_func

import re
import numpy as np
import concurrent.futures


def lambda_func(context: Context):

    return context.model_dump(include=[
        "params",
        "trace_id",
        "rewrite_question",
        "rerank_retrieve_before_qa",
    ])


@register_span_func(func_name="粗排-问题rerank", span_export_func=lambda_func)
def rerank_by_question(context: Context) -> Context:
    """
    去重逻辑说明：
    step1:单路去重
        step11:按得分高低排序
        step12:重复位置的内容取得分高的

    step2:多路融合去重（BM25与embedding）
        按短的来

    粗排逻辑说明：
    step1:根据位置信息统计出各位置的命中次数，命中高的往前排列
    step2:命中率一致的根据原始召回分数排序
    step3:当召回的片段命中次数都为1次时，将embedding的结果与bm25结果交叉排
    """
    # filter empty ebed_text
    context.normal_table_retrieve_small = [cur for cur in context.normal_table_retrieve_small if cur.ebed_text]
    context.fragment_retrieve_small = [cur for cur in context.fragment_retrieve_small if cur.ebed_text]

    # table_texts = [cur.ebed_text for cur in context.normal_table_retrieve_small]
    table_texts = ["".join(cur.keywords) for cur in context.normal_table_retrieve_small]
    fragment_texts = [cur.ebed_text for cur in context.fragment_retrieve_small]

    rerank_texts = [
        [strip_text_before_rerank(text)]
        for text in table_texts + fragment_texts
    ]

    # 调用 RerankApi 去获取分数
    rerank_scores = rerank_max_score(context.question_analysis.retrieve_question, rerank_texts)

    # 重排去重后去计算 repeat score
    r_contexts = generate_retieval_contexts(context, rerank_scores)
    r_contexts.sort(key=lambda x: x.question_rerank_score, reverse=True)

    # Duplicat Remove【ori_id有交集的进行重复计数】
    r_contexts = replace_duplicate_context(r_contexts)

    # 计算repeat的分数
    counter = Counter(r_contexts)
    for r_context, score in zip(list(counter.keys()), softmax(list(counter.values()))):
        r_context.repeat_score = score

    r_contexts = duplicates_list(r_contexts)
    # 计算粗排前的rank分数
    for r_context in r_contexts:
        # 求平均分
        r_context: RetrieveContext
        if isinstance(r_context.origin, DocTableModel):
            r_context.retrieve_rank_score = 1 / (1 + context.normal_table_retrieve_small.index(r_context.origin))
        elif isinstance(r_context.origin, DocFragmentModel):
            r_context.retrieve_rank_score = 1 / (1 + context.fragment_retrieve_small.index(r_context.origin))

    # 求平均分
    tt_rerank_score = sum([cur.question_rerank_score for cur in r_contexts]) if r_contexts else 0
    tt_retrieve_rank_score = sum([cur.retrieve_rank_score for cur in r_contexts]) if r_contexts else 0
    for r_context in r_contexts:
        r_context: RetrieveContext
        r_context.rerank_score_before_llm = (r_context.question_rerank_score / tt_rerank_score
                                             + r_context.repeat_score
                                             + r_context.retrieve_rank_score / tt_retrieve_rank_score
                                             ) / 3

    # Add fixed Table
    fixed_table_contexts = [
        RetrieveContext(origin=retrieval,
                        retrieval_type=RetrieveType.FIXED_TABLE,
                        tree_ori_ids=retrieval.ori_id,
                        tree_text=get_table_ori_text(retrieval, context.doc_items_cache),
                        rerank_score_before_llm=1.0  # fixed table 计分用1.0
                        )
        for retrieval in context.fixed_table_retrieve_small
    ]

    context.rerank_retrieve_before_qa = fixed_table_contexts + r_contexts
    return context


def strip_text_before_rerank(str):
    """
    过滤字符开始的章节信息.
    Args:
        str:
    Returns:
    """
    pattern = (
        r'第[一二三四五六七八九十0123456789]+节|'
        r'第[一二三四五六七八九十0123456789]+章|'
        r'第[1234567890一二三四五六七八九十]+条|'
        r'[一二三四五六七八九十]+( |、|\.|\t|\s+|:|：|．)|'
        r'(\(|（)[一二三四五六七八九十]+(\)|）)|'
        r'[0-9]+(\t| |、|\s+)|'
        r'\d+(\.|．|\-)\d+(?=[^(\.|．|\-)+\d]+)|'
        r'\d+(\.|．)+(\t| |、|[\u4e00-\u9fa5]|\s+)|'
        r'(\(|（)[0-9]+(\)|）)|'
        r'[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]+'
    )
    new_str = re.sub(pattern, "", str)
    new_str = new_str.replace('|', ' ')
    return new_str


def rerank_max_score(txt1: str, txt2s) -> list[float]:
    """
    滑窗段落根据段落切分，算问题和召回内容的相似度.
    Args:
        txt1: 答案
        txt2s: 召回内容

    Returns:
        相似度打分
    """
    similarities = []
    txt2_combines_all = []
    txt2_combines_length = []
    for txt2 in txt2s:
        if isinstance(txt2, list):
            # 召回是增强切片的list
            txt2_combines_all.extend(txt2)
            txt2_combines_length.append(len(txt2))
        else:
            txt2_combines_all.append(txt2)
            txt2_combines_length.append(1)
    # 每个划窗的span的分数
    if len(txt2_combines_all) > 0:
        clean_txt2s = []
        for txt2 in txt2_combines_all:
            # 表格线替换为空
            txt2 = txt2.replace('|', ' ')
            clean_txt2s.append(txt2)
        concurrent_split_txts = split_list(txt2_combines_all, chunk_size=16)
        pairs = [[[txt1], concurrent_split_txt] for concurrent_split_txt in concurrent_split_txts]
        tasks_with_index = [
            (i, txt2) for i, txt2 in enumerate(pairs)
        ]
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(rerank_api_by_cache, txt2, headers=None, url=config["textin"]["rerank_url"], if_softmax=0): idx for idx, txt2 in tasks_with_index}

            # 使用OrderedDict来保证按原顺序收集结果
            ordered_results = OrderedDict()
            for future in concurrent.futures.as_completed(futures):
                idx = futures[future]
                result = future.result()
                ordered_results[idx] = result

            # 提取并排序结果
            ress = [ordered_results[i] for i in range(len(ordered_results))]
        text_span_scores = [score for text_span_score in ress for score in text_span_score]
        text_span_scores = [round(score, 4) for score in softmax(text_span_scores)]

        # pairs = [[txt1], clean_txt2s]
        # text_span_scores = rerank_api_by_cache(pairs, headers=None, url=config["textin"]["rerank_url"], if_softmax=0)
        start = 0
        for txt2_combine_length in txt2_combines_length:
            text_span_score = text_span_scores[start:start + txt2_combine_length]
            start += txt2_combine_length
            similarity = max(text_span_score) if text_span_score else 0  # txt2 为空列表的时候
            similarities.append(similarity)
    return np.array(similarities).tolist()


def generate_retieval_contexts(context: Context, rerank_scores: list[float]) -> list[RetrieveContext]:
    r_contexts = []

    for retrieval, rerank_score in zip(context.normal_table_retrieve_small + context.fragment_retrieve_small, rerank_scores):
        if isinstance(retrieval, DocTableModel):
            r_context = RetrieveContext(
                origin=retrieval,
                question_rerank_score=rerank_score,
                retrieval_type=RetrieveType.NORMAL_TABLE,
                tree_ori_ids=retrieval.ori_id,
                tree_text=get_table_ori_text(retrieval, context.doc_items_cache),
            )
            r_contexts.append(r_context)

        elif isinstance(retrieval, DocFragmentModel):
            r_context = RetrieveContext(
                origin=retrieval,
                question_rerank_score=rerank_score,
                retrieval_type=RetrieveType.PARAGRAPH,
                tree_ori_ids=get_fragment_ori_ids(retrieval, context.fragment_cache),
                tree_text=get_fragment_ori_text(retrieval, context.fragment_cache, context.doc_items_cache),
                tree_all_texts=get_fragment_all_texts(retrieval, context.fragment_cache, context.doc_items_cache),
            )
            r_contexts.append(r_context)

    return r_contexts


def replace_duplicate_context(contexts: list[RetrieveContext]) -> list[RetrieveContext]:
    """
    位置信息有重复的，取得分高的位置信息(排序top的), 仅替换，而并非删除
    """

    for i in range(0, len(contexts)):
        for j in range(i + 1, len(contexts)):
            if contexts[j].intersect(contexts[i]):
                # 添加 进 related
                contexts[i].related.append(contexts[j].origin)
                contexts[j] = contexts[i]

                break

    return contexts
