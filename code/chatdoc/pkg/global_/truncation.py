'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-06 15:04:12
LastEditors: longsion
LastEditTime: 2024-10-15 18:21:48
'''

from pkg.global_.objects import Context, RetrieveContext
from pkg.llm.template_manager import TemplateManager
from pkg.utils.decorators import register_span_func
from pkg.utils import group_by_func
from pkg.utils.logger import logger
from pkg.config import config

from pkg.es.es_p_file import PESFileObject

from pkg.es.es_doc_table import DocTableModel
from pkg.es.es_file import ESFileObject

import typing


def func_span(context: Context):

    return dict(
        params=context.params.model_dump(),
        rewrite_question=context.question_analysis.rewrite_question,
        retrieve_count=len(context.rerank_retrieve_before_qa),
        rerank_retrieve_before_qa=[
            dict(
                retrieval_type=retrieve_context.retrieval_type.value,
                ori_ids=retrieve_context.ori_ids,
            )
            for retrieve_context in context.rerank_retrieve_before_qa
        ],
    )


@register_span_func(func_name="问答前截断", span_export_func=func_span)
def truncation(context: Context) -> Context:
    """
    截断，最终用于大模型答案生成的召回
    """

    truncation_retrieve = []
    for ind, (_, r_contexts) in enumerate(group_by_func(context.rerank_retrieve_before_qa, lambda x: x.file_uuid)):
        if ind > 20:
            break
        for r_context in r_contexts:
            truncation_retrieve.append(r_context)

    context.rerank_retrieve_before_qa = truncation_retrieve
    prompt_context = generate_context(context)
    prompt_temp = TemplateManager().get_template("qa_input_global")
    context.llm_question = prompt_temp.format(question=context.question_analysis.rewrite_question, context=prompt_context)
    logger.info(f"----- Prompt: {len(context.llm_question)}, context_len: {len(prompt_context)} -----")

    return context


def top_p(retrieve_contexts: list[RetrieveContext], top_p_score) -> list[RetrieveContext]:
    tt_score = sum([retrieval_info.rerank_score_before_llm for retrieval_info in retrieve_contexts])
    top_p_score_this, results = 0.0, []
    for retrieval_info in retrieve_contexts:
        if top_p_score >= top_p_score_this:
            results.append(retrieval_info)
            top_p_score_this += retrieval_info.rerank_score_before_llm / tt_score
        else:
            break
    return results


def truncation_by_token_limit(retrieve_contexts: list[RetrieveContext], max_length) -> list[RetrieveContext]:

    if retrieve_contexts == []:
        return retrieve_contexts

    first_text = retrieve_contexts[0].tree_text
    if len(first_text) > max_length:
        retrieve_contexts[0].tree_text = retrieve_contexts[0].tree_text[:max_length]
        return retrieve_contexts[0:1]

    filter_retrieve_contexts = []
    remain_length = max_length
    for r in retrieve_contexts:
        if remain_length >= len(r.tree_text):
            remain_length -= len(r.tree_text)
            filter_retrieve_contexts.append(r)
        else:
            filter_retrieve_contexts.append(r)
            break

    return filter_retrieve_contexts


def generate_context(context: Context):
    """
    生成prompt
    """
    # 按照文件进行group
    max_length = int(config["retrieve"]["retrieval_max_length"])
    temp_group_context = []
    _context = ""
    file_uuid_mapper = {file.uuid: file for file in context.files + context.locationfiles}
    tag_counter = 1
    for ind, (file_uuid, r_contexts) in enumerate(group_by_func(context.rerank_retrieve_before_qa, lambda x: x.file_uuid)):
        file_entity: typing.Union[ESFileObject, PESFileObject] = file_uuid_mapper.get(file_uuid)
        if file_entity:
            _context += "# 来源文档\n"
            _context += file_entity.get_file_desc_md(context.company_mapper) + "\n"
            temp_group_context.append("# 来源文档\n" + file_entity.get_file_desc_md(context.company_mapper) + "\n")
        each_contexts = ''
        # 每份文件召回全选
        for r_context in r_contexts:
            r_context: RetrieveContext
            r_llm_text = r_context.tree_text
            r_context.reference_tag = f"IFTAG{tag_counter}"
            tag_counter += 1
            each_contexts += f"## 来源标识: {r_context.reference_tag}\n"
            if isinstance(r_context.origin, DocTableModel):
                # 表名 + 表内容
                each_contexts += r_context.origin.title + "：\n" + r_llm_text + "\n\n"
            else:
                # 标题 + 段落
                each_contexts += r_llm_text + "\n\n"
        _context += each_contexts
        temp_group_context[ind] += each_contexts
        if len(_context) > max_length:
            break
    # _context = _context[:max_length]
    temp_group_context_ = process_list(temp_group_context)
    p_context = "".join(temp_group_context_)
    return p_context


def process_list(nums):
    '''
    nums = [0, 1, 2, 3, 4, 5, 6]
    return [0, 2, 4, 6, 5, 3, 1]
    '''
    # 分别初始化两个空列表 a 和 b
    a = []
    b = []

    # 遍历原始列表，根据索引的奇偶性将元素分配到不同的列表中
    for index, value in enumerate(nums):
        if index % 2 == 0:  # 偶数索引位置的元素
            a.append(value)
        else:  # 奇数索引位置的元素
            b.append(value)

    # 将列表 b 的元素倒序排列得到 b'
    b_prime = b[::-1]

    # 合并列表 a 和 b' 并返回结果
    return a + b_prime