'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-06 14:57:34
LastEditors: longsion
LastEditTime: 2024-10-23 17:01:05
'''

from collections import OrderedDict
from pkg.es.es_file import ESFileObject, FileES
from pkg.es.es_p_doc_fragment import PDocFragmentModel
from pkg.es.es_p_doc_table import PDocTableModel
from pkg.es.es_p_file import PESFileObject, PFileES
from pkg.global_.common import fillin_doc_items_cache, fillin_fragment_children_cache, fillin_personal_doc_items_cache, fillin_personal_fragment_children_cache, get_fragment_all_texts, get_fragment_ori_ids, get_fragment_ori_text, get_table_ori_text
from pkg.global_.objects import Context, RetrieveContext, RetrieveType, GlobalQAType
from pkg.config import config
from pkg.es.es_doc_fragment import DocFragmentModel
from pkg.es.es_doc_table import DocTableModel
from pkg.storage import Storage
from pkg.utils.jaeger import TracedThreadPoolExecutor
from .preprocess_question import file_filter
from pkg.rerank import rerank_api_by_cache
from pkg.utils import compress, decompress, log_msg, split_list, sigmoid, xjson
from pkg.utils.decorators import register_span_func
from pkg.utils.logger import logger
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.redis.redis import redis_store

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
    table_texts = [re.sub(r"\d+", "", "".join(cur.keywords)) for cur in context.normal_table_retrieve_small]
    fragment_texts = [cur.ebed_text for cur in context.fragment_retrieve_small]

    rerank_texts = [
        [strip_text_before_rerank(text)]
        for text in table_texts + fragment_texts
    ]

    # 调用 RerankApi 去获取分数
    uuids = list(set([c.uuid for c in context.normal_table_retrieve_small]
                     + [c.file_uuid for c in context.fragment_retrieve_small]
                     + [f.uuid for f in context.locationfiles if context.locationfiles]))

    if not uuids:
        # 召回为空，直接返回
        return context

    if context.params.qa_type == GlobalQAType.ANALYST.value:
        retrieve_files_t = ThreadWithReturnValue(target=get_files_by_uuid, args=(uuids,))

    elif context.params.qa_type == GlobalQAType.PERSONAL.value:
        retrieve_files_t = ThreadWithReturnValue(target=get_personal_files_by_uuid, args=(context.params.user_id, uuids,))

    else:
        retrieve_files_t = ThreadWithReturnValue(target=get_both_files_by_uuid, args=(context,))

    retrieve_files_t.start()
    rerank_scores = rerank_max_score(context.question_analysis.retrieve_question, rerank_texts)
    context.files = retrieve_files_t.join()
    context = file_filter(context)
    # 对切片进行cache填充
    process_cache_t = ThreadWithReturnValue(target=process_cache, args=(context,))
    process_cache_t.start()
    uuid_rerank_scores = rerank_score_by_filename(context)
    process_cache_t.join()
    # 重排去重后去计算 repeat score
    r_contexts = generate_retieval_contexts(context, rerank_scores, uuid_rerank_scores)

    for r_context in r_contexts:
        r_context: RetrieveContext
        r_context.rerank_score_before_llm = r_context.question_rerank_score + r_context.filename_rerank_score
    # 根据分数过滤召回
    filter_r_contexts = [r for r in r_contexts if r.question_rerank_score >= 0.3]
    if len(filter_r_contexts) > 5:
        r_contexts = filter_r_contexts
    r_contexts.sort(key=lambda x: x.rerank_score_before_llm, reverse=True)
    # Add fixed Table
    fixed_table_contexts = [
        RetrieveContext(origin=retrieval,
                        retrieval_type=RetrieveType.FIXED_TABLE,
                        tree_ori_ids=retrieval.ori_id,
                        tree_text=get_table_ori_text(retrieval, context.doc_items_cache, context.p_doc_items_cache),
                        rerank_score_before_llm=2.0
                        )
        for retrieval in context.fixed_table_retrieve_small
    ]
    context.rerank_retrieve_before_qa = fixed_table_contexts + r_contexts
    # 如果个人和系统知识库召回到相同的文件，则使用排序靠前的文件，过滤掉排序靠后的文件
    file_uuid_kb_map = dict()
    filter_rerank_retrieve_before_qa = []
    for r_context in context.rerank_retrieve_before_qa:
        if r_context.file_uuid not in file_uuid_kb_map:
            file_uuid_kb_map[r_context.file_uuid] = r_context.kb

        elif file_uuid_kb_map[r_context.file_uuid] != r_context.kb:
            continue

        filter_rerank_retrieve_before_qa.append(r_context)

    context.rerank_retrieve_before_qa = filter_rerank_retrieve_before_qa

    context.files = [f for f in context.files if f.uuid in list(set(r.file_uuid for r in context.rerank_retrieve_before_qa))]
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
        with TracedThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(rerank_api_by_cache, txt2, headers=None, url=config["textin"]["rerank_url"], if_softmax=0): idx for idx, txt2 in tasks_with_index}

            # 使用OrderedDict来保证按原顺序收集结果
            ordered_results = OrderedDict()
            for future in concurrent.futures.as_completed(futures):
                idx = futures[future]
                result = future.result()
                ordered_results[idx] = result

            # 提取并排序结果
            ress = [ordered_results[i] for i in range(len(ordered_results))]
        text_span_scores = [sigmoid(score) for text_span_score in ress for score in text_span_score]
        # text_span_scores = [round(score, 4) for score in softmax(text_span_scores)]

        # pairs = [[txt1], clean_txt2s]
        # text_span_scores = rerank_api_by_cache(pairs, headers=None, url=config["textin"]["rerank_url"], if_softmax=0)
        start = 0
        for txt2_combine_length in txt2_combines_length:
            text_span_score = text_span_scores[start:start + txt2_combine_length]
            start += txt2_combine_length
            similarity = max(text_span_score) if text_span_score else 0  # txt2 为空列表的时候
            similarities.append(similarity)
    return np.array(similarities).tolist()


def rerank_score_by_filename(context):
    """
    算问题和召回文档标题的相似度.
    Args:
        context:Context

    Returns:
        {file_uuid1: score1, file_uuid2: score2, ...}
    """
    location_uuids = [l.uuid for l in context.locationfiles]
    query = context.params.question
    name_uuid_dic = {c.filename: c.uuid for c in context.files}
    file_names = list(name_uuid_dic.keys())
    concurrent_split_txts = split_list(file_names, chunk_size=16)
    pairs = [[[query], concurrent_split_txt] for concurrent_split_txt in concurrent_split_txts]
    tasks_with_index = [
        (i, txt2) for i, txt2 in enumerate(pairs)
    ]
    with TracedThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(rerank_api_by_cache, txt2, headers=None, url=config["textin"]["rerank_url"], if_softmax=0): idx for idx, txt2 in tasks_with_index}

        # 使用OrderedDict来保证按原顺序收集结果
        ordered_results = OrderedDict()
        for future in concurrent.futures.as_completed(futures):
            idx = futures[future]
            result = future.result()
            ordered_results[idx] = result

        # 提取并排序结果
        ress = [ordered_results[i] for i in range(len(ordered_results))]
    text_span_scores = [sigmoid(score) for text_span_score in ress for score in text_span_score]
    # hard_code
    max_score = max(text_span_scores) if text_span_scores else 0
    if 0.1 <= max_score * 10 < 1:
        alp = 10
    elif 0.1 <= max_score * 100 < 1:
        alp = 100
    else:
        alp = 1
    text_span_scores = [score * alp for score in text_span_scores]
    name_score_dic = dict(zip(file_names, text_span_scores))
    uuid_score_dic = {name_uuid_dic[k]: v for k, v in name_score_dic.items()}
    for k in location_uuids:
        uuid_score_dic[k] = 1.0
    return uuid_score_dic


def generate_retieval_contexts(context: Context, rerank_scores: list[float], uuid_rerank_scores: list[float]) -> list[RetrieveContext]:
    r_contexts = []
    # 校验切片信息
    temp_normal_table_retrieve_small = [r for r in context.normal_table_retrieve_small if r.uuid in list(uuid_rerank_scores.keys())]
    temp_fragment_retrieve_small = [r for r in context.fragment_retrieve_small if r.file_uuid in list(uuid_rerank_scores.keys())]
    context.normal_table_retrieve_small = temp_normal_table_retrieve_small
    context.fragment_retrieve_small = temp_fragment_retrieve_small
    for retrieval, rerank_score in zip(context.normal_table_retrieve_small + context.fragment_retrieve_small, rerank_scores):

        uuid_score = uuid_rerank_scores[retrieval.uuid] if retrieval.uuid in list(uuid_rerank_scores.keys()) else uuid_rerank_scores[retrieval.file_uuid]

        if isinstance(retrieval, DocTableModel) or isinstance(retrieval, PDocTableModel):
            r_context = RetrieveContext(
                origin=retrieval,
                question_rerank_score=rerank_score,
                filename_rerank_score=uuid_score,
                retrieval_type=RetrieveType.NORMAL_TABLE,
                tree_ori_ids=retrieval.ori_id,
                tree_text=get_table_ori_text(retrieval, context.doc_items_cache, context.p_doc_items_cache),
            )
            r_contexts.append(r_context)

        elif isinstance(retrieval, DocFragmentModel) or isinstance(retrieval, PDocFragmentModel):
            try:
                r_context = RetrieveContext(
                    origin=retrieval,
                    question_rerank_score=rerank_score,
                    filename_rerank_score=uuid_score,
                    retrieval_type=RetrieveType.PARAGRAPH,
                    tree_ori_ids=get_fragment_ori_ids(retrieval, context.fragment_cache),
                    tree_text=get_fragment_ori_text(retrieval, context.fragment_cache, context.doc_items_cache, context.p_doc_items_cache),
                    tree_all_texts=get_fragment_all_texts(retrieval, context.fragment_cache, context.doc_items_cache, context.p_doc_items_cache),
                )
            except Exception:
                logger.error("get tree_text error!!!")
                continue
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


def fill_fragments_cache(context: Context):
    # 从doc_fragments_json中更新 context.fragment_cache
    for file in context.files:
        if file.doc_fragments_json:
            doc_fragments = xjson.loads(file.doc_fragments_json)
            if isinstance(doc_fragments, list):
                # without embeddings
                if isinstance(file, ESFileObject):
                    doc_fragments = [
                        DocFragmentModel.if_model_construct(**fragment, file_uuid=file.uuid) for fragment in doc_fragments
                    ]
                else:
                    doc_fragments = [
                        PDocFragmentModel.if_model_construct(**fragment, file_uuid=file.uuid) for fragment in doc_fragments
                    ]

                context.fragment_cache.update({doc_fragment.uuid: doc_fragment for doc_fragment in doc_fragments})


def process_cache(context: Context):
    fill_fragments_cache(context)
    analyst_tables = [table for table in context.normal_table_retrieve_small + context.fixed_table_retrieve_small if isinstance(table, DocTableModel)]
    personal_tables = [table for table in context.normal_table_retrieve_small + context.fixed_table_retrieve_small if isinstance(table, PDocTableModel)]

    analyst_ori_ids = [(table.uuid, ori_id) for table in analyst_tables for ori_id in table.ori_id]
    personal_ori_ids = [(table.uuid, ori_id) for table in personal_tables for ori_id in table.ori_id]

    analyst_fragments = [fragment for fragment in context.fragment_retrieve_small if isinstance(fragment, DocFragmentModel)]
    personal_fragments = [fragment for fragment in context.fragment_retrieve_small if isinstance(fragment, PDocFragmentModel)]

    if analyst_fragments:
        analyst_ori_ids.extend(
            fillin_fragment_children_cache(context.fragment_cache, analyst_fragments)
        )

    if personal_fragments:
        personal_ori_ids.extend(
            fillin_personal_fragment_children_cache(context.fragment_cache, personal_fragments)
        )

    if analyst_ori_ids:
        fillin_doc_items_cache(context.doc_items_cache, list(set(analyst_ori_ids)))

    if personal_ori_ids:
        fillin_personal_doc_items_cache(context.p_doc_items_cache, context.params.user_id, list(set(personal_ori_ids)))


def get_files_by_uuid(uuids, with_doc_fragments_json=True):
    all_files = FileES().get_by_file_uuids(uuids, with_doc_fragments_json=False)

    if with_doc_fragments_json:
        attach_file_fragments_json(all_files)

    return all_files


def get_personal_files_by_uuid(user_id, uuids, with_doc_fragments_json=True):
    all_files = PFileES().get_by_file_uuids(user_id, uuids, with_doc_fragments_json=False)

    if with_doc_fragments_json:
        attach_p_file_fragments_json(user_id, all_files)

    return all_files


def get_both_files_by_uuid(context: Context):
    analyst_uuids = list(set([c.uuid for c in context.normal_table_retrieve_small if isinstance(c, DocTableModel)]
                             + [c.file_uuid for c in context.fragment_retrieve_small if isinstance(c, DocFragmentModel)]
                             + [f.uuid for f in context.locationfiles if context.locationfiles if isinstance(f, ESFileObject)]))

    personal_uuids = list(set([c.uuid for c in context.normal_table_retrieve_small if isinstance(c, PDocTableModel)]
                              + [c.file_uuid for c in context.fragment_retrieve_small if isinstance(c, PDocFragmentModel)]
                              + [f.uuid for f in context.locationfiles if context.locationfiles if isinstance(f, PESFileObject)]))

    personal_t = ThreadWithReturnValue(target=get_personal_files_by_uuid, args=(context.params.user_id, personal_uuids))
    personal_t.start()

    all_files = get_files_by_uuid(analyst_uuids) + personal_t.join()

    return all_files


def attach_file_fragments_json(files: list[ESFileObject]):
    uuids = [file.uuid for file in files]
    cache_keys = [f"fragment-{u}" for u in uuids]
    cached_results = redis_store.mget(cache_keys)

    uncached_files = []
    for i, _file in enumerate(files):
        if cached_results[i]:
            _file.doc_fragments_json = decompress(cached_results[i])

        else:
            uncached_files.append(_file)

    def _attach_file_fragments_json(_file):
        fragment_gz, err = Storage.download_content(f"fragments-{_file.uuid}.gz")
        if err:
            fragment_json = FileES().search_file_fragment_json(_file.uuid)
            _file.doc_fragments_json = fragment_json
            if fragment_json:
                Storage.upload(f"fragments-{_file.uuid}.gz", compress(fragment_json))
                redis_store.set(f"fragment-{_file.uuid}", compress(fragment_json))
        else:
            _file.doc_fragments_json = decompress(fragment_gz)
            redis_store.set(f"fragment-{_file.uuid}", fragment_gz)

    with TracedThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(_attach_file_fragments_json, _file) for _file in uncached_files]
        for _ in futures:
            pass


def attach_p_file_fragments_json(user_id: str, files: list[PESFileObject]):
    uuids = [file.uuid for file in files]
    cache_keys = [f"fragment-{user_id}-{u}" for u in uuids]
    cached_results = redis_store.mget(cache_keys)

    uncached_files = []
    for i, _file in enumerate(files):
        if cached_results[i]:
            _file.doc_fragments_json = decompress(cached_results[i])

        else:
            uncached_files.append(_file)

    def _attach_p_file_fragments_json(_file):
        fragment_gz, err = Storage.download_content(f"User_{user_id}/fragments-{_file.uuid}.gz")
        if err:
            fragment_json = PFileES().search_file_fragment_json(user_id, _file.uuid)
            _file.doc_fragments_json = fragment_json
            if fragment_json:
                Storage.upload(f"User_{user_id}/fragments-{_file.uuid}.gz", compress(fragment_json))
                redis_store.set(f"fragment-{user_id}-{_file.uuid}", compress(fragment_json), ex=86400 * 30)  # 缓存过期时间为 30天
        else:
            _file.doc_fragments_json = decompress(fragment_gz)
            redis_store.set(f"fragment-{user_id}-{_file.uuid}", fragment_gz, ex=86400 * 30)  # 缓存过期时间为 30天

    with TracedThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(_attach_p_file_fragments_json, _file) for _file in uncached_files]
        for _ in futures:
            pass
