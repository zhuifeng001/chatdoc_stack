'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-06 15:14:01
LastEditors: longsion
LastEditTime: 2024-05-10 14:18:35
'''


from pkg.global_.objects import Context
from pkg.compliance.text import TextCompliance
from pkg.utils.decorators import register_span_func


def func_span(context: Context):

    return dict(
        params=context.params.model_dump(),
        llm_answer=context.llm_answer,
        answer_compliance=context.answer_compliance
    )


@register_span_func(func_name="答案合规检查", span_export_func=func_span)
def func(context: Context) -> Context:
    if context.params.compliance_check:
        context.answer_compliance = TextCompliance().is_text_valid(context.llm_answer)

    return context
