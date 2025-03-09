'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-26 11:35:27
LastEditors: longsion
LastEditTime: 2024-10-15 16:57:49
'''

from concurrent.futures import ThreadPoolExecutor
import time
from typing import Callable
from opentelemetry import context as otel_context
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SpanExporter

from pkg.config import config
from pkg.utils.thread_with_return_value import ThreadContext, get_thread_context, set_thread_context

# 创建Jaeger Exporter实例
jaeger_exporter = JaegerExporter(
    # service_name=config["jaeger"]["service_name"],  # 设置服务名
    agent_host_name=config["jaeger"]["agent_host_name"],  # 如果使用本地代理，则设置Jaeger Agent的主机名，默认端口是6831用于UDP传输
    collector_endpoint=config["jaeger"]["collector_url"]  # 如果直接发送到Collector，则设置Endpoint地址
)

console_span_exporter = ConsoleSpanExporter(service_name=config["jaeger"]["service_name"])

# 创建Tracer Provider，并添加Jaeger Span Processor
tracer_provider = TracerProvider(resource=Resource.create({SERVICE_NAME: config["jaeger"]["service_name"]}))

if config["jaeger"]["exporter"] == "none":
    tracer_provider.add_span_processor(BatchSpanProcessor(SpanExporter()))
elif config["jaeger"]["exporter"] == "console":
    tracer_provider.add_span_processor(BatchSpanProcessor(console_span_exporter))
else:
    tracer_provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))

# 设置全局Tracer Provider
trace.set_tracer_provider(tracer_provider)

# 启用requests的自动追踪
RequestsInstrumentor().instrument()


tracer = trace.get_tracer(__name__)


class TracedThreadPoolExecutor(ThreadPoolExecutor):
    """Implementation of :class:`ThreadPoolExecutor` that will pass context into sub tasks."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def with_otel_context(self, thread_context: ThreadContext, context: otel_context.Context, fn: Callable, func_name: str):
        if context:
            otel_context.attach(context)
        p_thread_context = ThreadContext(
            # pid = threading.get_ident(),
            trace_id=thread_context.trace_id,
            extra=thread_context.extra,
        )
        set_thread_context(p_thread_context)

        st = time.time()
        p_thread_context.st = st
        result = fn()
        et = time.time()
        p_thread_context.duration = (et - st) * 1000
        from pkg.utils.logger import logger
        logger.debug(f"TracedThreadPoolExecutor: {func_name}, {p_thread_context}")
        return result

    def submit(self, fn, *args, **kwargs):
        """Submit a new task to the thread pool."""  # get the current otel context
        context = otel_context.get_current()
        thread_context = get_thread_context()
        return super().submit(
            lambda: self.with_otel_context(
                thread_context, context, lambda: fn(*args, **kwargs), fn.__name__
            ),
        )
