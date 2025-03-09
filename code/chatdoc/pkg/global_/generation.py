'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-06 15:12:45
LastEditors: longsion
LastEditTime: 2024-10-15 17:54:34
'''
from pkg.exceptions import LLMComplianceError
from pkg.global_.objects import Context
from pkg.llm.llm import LLM
from pkg.utils.decorators import register_span_func
from pkg.config import config
from pkg.utils.logger import logger

llm = LLM()


def func_span(context: Context):

    return dict(
        params=context.params.model_dump(),
        llm_question=context.llm_question,
        prompt_length=len(context.llm_question),
        llm_model=config["llm"]["model"],
        model_config=config[config["llm"]["model"]],
        llm_answer=context.llm_answer,
        answer_length=len(context.llm_answer) if context.llm_answer else 0,
    )


@register_span_func(func_name="LLM问答", span_export_func=func_span)
def generation(context: Context) -> Context:
    """
    生成
    """

    try:
        answer_or_iterator = llm.chat(context.llm_question, stream=context.params.stream)
    except LLMComplianceError:
        answer_or_iterator = config["compliance"]["warning_text"]
        context.answer_compliance = False

    if isinstance(answer_or_iterator, str):
        context.llm_answer = answer_or_iterator
    else:
        context.stream_iter = answer_or_iterator

    logger.info(f"Statistics , question_len: {len(context.llm_question)}, answer_len: {len(context.llm_answer or '')}")

    return context
