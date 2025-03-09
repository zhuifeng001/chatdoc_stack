'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-17 09:50:52
LastEditors: longsion
LastEditTime: 2024-05-27 14:48:17
'''


from pkg.personal.objects import Context
from pkg.compliance.text import TextCompliance
from pkg.utils.decorators import register_span_func


def func_span(context: Context):

    return dict(
        params=context.params.model_dump(),
        question_compliance=context.question_compliance,
    )


@register_span_func(func_name="问题合规检查", span_export_func=func_span)
def func(context: Context) -> Context:
    question = context.params.question
    if context.params.compliance_check:
        context.question_compliance = TextCompliance().is_text_valid(question)

    return context
