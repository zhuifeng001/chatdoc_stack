'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-27 14:34:25
LastEditors: longsion
LastEditTime: 2024-10-22 11:24:39
'''
import datetime
import time
from pkg.personal.objects import Params, Context, Response
from pkg.utils.logger import logger
from pkg.utils.decorators import register_span_func
from pkg.config import config
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.llm.util import check_repetition, get_stream_json, remove_repetition, set_stream_json, stream_fixes_suffix

from opentelemetry import context as otel_context
from opentelemetry.trace import get_current_span


def process(params: Params) -> Context:

    from .compliance_question import func as compliance_question
    from .preprocess_question import preprocess_question
    from .rerank_by_question import rerank_by_question
    from .small2big import small2big
    from .truncation import truncation
    from .generation import generation
    from .compliance_answer import func as compliance_answer
    from .rerank_by_answer import func as rerank_by_answer
    from .retrieve_small import retrieve_small

    context = Context(params=params)

    context.start_ts = time.time()
    context.durations.update(start=str(datetime.datetime.now()))

    span_ctx = otel_context.get_current()
    # 赋予trace_id
    context.trace_id = f"{get_current_span().context.trace_id:0x}"

    # 并行合规检测
    compliance_t = ThreadWithReturnValue(target=compliance_question, args=(context,), parent_span_context=span_ctx)
    compliance_t.start()

    # 预处理问题，分析问题，确定AgentType
    context = preprocess_question(context)

    # 预处理与合并检测并行
    context = compliance_t.join()
    if context.question_compliance is False:
        context.answer_response = Response(answer=config["compliance"]["warning_text"], question_compliance=False, trace_id=context.trace_id, durations=context.durations)
        return context

    if not context.files:
        context.answer_response = Response(answer="未定位到相关文件，请检查问题或重新输入", question_compliance=True, trace_id=context.trace_id, durations=context.durations)
        return context

    context = retrieve_small(context)

    # 问题与召回rerank
    context = rerank_by_question(context)

    # small2big
    context = small2big(context)

    # 组合&&截断
    context = truncation(context)

    # if no chat
    if context.params.no_chat:
        context.answer_response = gen_response_by_context(context)
        return context

    # 生成答案后处理

    def _on_done(context) -> Response:
        # 兼容异步情况链路上报
        otel_context.attach(span_ctx)

        # 大模型接口报错 - prompt 出现不合法内容
        if context.answer_compliance is False:
            return Response(answer=config["compliance"]["warning_text"], question_compliance=True, answer_compliance=False, trace_id=context.trace_id)

        # 校验答案
        context = compliance_answer(context)
        if context.answer_compliance is False:
            return Response(answer=config["compliance"]["warning_text"], question_compliance=True, answer_compliance=False, trace_id=context.trace_id)
        # 获得答案后重排
        if len(context.files) < 2:
            context = rerank_by_answer(context)
        # 异步加上 span_ctx上报
        context = report_process_result(context)

        return gen_response_by_context(context)

    def _after_trunction():
        nonlocal context
        # yield 召回结果
        ori = [
            dict(
                ori_id=ori_id,
                uuid=r.file_uuid,
                i=i  # 返回召回的顺序
            )
            for i, r in enumerate(context.rerank_retrieve_before_qa) for ori_id in r.ori_ids
        ]
        yield set_stream_json(
            {
                "status": "DOING",
                "content": "",
                "stage": "retrieve_result",
                "data": dict(source=ori)
            }
        )
        context.durations.update(
            推送召回结果=f"{(time.time() - context.start_ts) * 1000:.1f}ms"
        )
        logger.info(f"推送召回结果 duration: {context.durations['推送召回结果']}")
        # 生成
        context = generation(context)
        yield from _after_generation()

    def _after_generation():
        nonlocal context
        answer_text = ""
        for x in context.stream_iter:
            if not answer_text:
                first_ts = time.time()
                context.durations.update(
                    首token=f"{(first_ts - context.start_ts) * 1000:.1f}ms"
                )
                logger.info(f"首token duration: {context.durations['首token']}")
            if x == stream_fixes_suffix:
                last_ts = time.time()
                context.durations.update(
                    尾token=f"{(last_ts - context.start_ts) * 1000:.1f}ms",
                    token速率=f"{len(answer_text)/(last_ts-first_ts):.1f} token/s"
                )
                logger.info(f"尾token duration: {context.durations['尾token']}, token速率: {context.durations['token速率']}, ")
                yield x
                break
            x_json = get_stream_json(x)
            if x_json["status"] == "DONE":
                context.llm_answer = answer_text
                response = _on_done(context)
                x_json.update(data=response.model_dump_json())
                yield set_stream_json(x_json)
            elif x != stream_fixes_suffix and check_repetition(answer_text, x_json["content"]):
                context.llm_answer = remove_repetition(answer_text, x_json["content"])
                response = _on_done(context)
                # response.answer_compliance = False
                x_json.update(data=response.model_dump_json(), status="DONE")
                yield set_stream_json(x_json)
                last_ts = time.time()
                context.durations.update(
                    尾token=f"{(last_ts - context.start_ts) * 1000:.1f}ms",
                    token速率=f"{len(answer_text)/(last_ts-first_ts):.1f} token/s"
                )
                logger.info(f"尾token duration: {context.durations['尾token']}, token速率: {context.durations['token速率']}, ")
                yield stream_fixes_suffix
                break
            else:
                answer_text += x_json["content"] if x != stream_fixes_suffix else ""
                yield x

    if context.params.stream:
        context.answer_response_iter = _after_trunction()
    else:
        # 生成
        context = generation(context)
        context.answer_response = _on_done(context)

    return context


def gen_response_by_context(context: Context) -> Response:

    rerank = context.rerank_retrieve_after_qa or context.rerank_retrieve_before_qa
    ori = [
        dict(
            ori_id=ori_id,
            uuid=r.file_uuid,
            i=i  # 返回召回的顺序
        )
        for i, r in enumerate(rerank) for ori_id in r.ori_ids
    ]

    return Response(
        answer=context.llm_answer or "",
        prompt=context.llm_question or "",
        source=ori,
        full=[r.gen_full_return() for r in rerank],
        retrieval={},
        answer_or_iterator=context.llm_answer,
        question_compliance=context.question_compliance,
        answer_compliance=context.answer_compliance,
        trace_id=context.trace_id,
        durations=context.durations,
    )


def func_span(context: Context):

    return dict(
        params=context.params.model_dump(),
        question_analysis=context.question_analysis.model_dump(),
        files=[
            file.model_dump(exclude=["doc_fragments_json"]) for file in context.files
        ],
        llm_question=context.llm_question,
        llm_answer=context.llm_answer,
        question_compliance=context.question_compliance,
        answer_compliance=context.answer_compliance,
        rerank_retrieve_after_qa=[
            dict(
                answer_rerank_score=retrieve_context.answer_rerank_score,
                ori_id=retrieve_context.ori_ids,
                file_uuid=retrieve_context.file_uuid,
                ans_rerank_texts=retrieve_context.ans_rerank_texts,
            )
            for retrieve_context in context.rerank_retrieve_after_qa
        ]
    )


@register_span_func(func_name="问答结果", span_export_func=func_span)
def report_process_result(context: Context):
    return context
