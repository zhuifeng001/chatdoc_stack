'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-06 15:04:12
LastEditors: longsion
LastEditTime: 2024-06-03 15:44:57
'''


from pkg.personal.objects import Context, RetrieveContext
from pkg.config import config
from pkg.utils.decorators import register_span_func


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
    截断
    """
    if len(context.locationfiles) < 2:
        # topP
        context.rerank_retrieve_before_qa = top_p(context.rerank_retrieve_before_qa, top_p_score=config['infer']['rough_rank_score'])
        # topN
        if len(context.rerank_retrieve_before_qa) > config["retrieve"]["retrieval_top_n"]:
            context.rerank_retrieve_before_qa = context.rerank_retrieve_before_qa[:config["retrieve"]["retrieval_top_n"]]
        # token limit
        context.rerank_retrieve_before_qa = truncation_by_token_limit(context.rerank_retrieve_before_qa, max_length=int(config["retrieve"]["retrieval_max_length"] / 2))
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
