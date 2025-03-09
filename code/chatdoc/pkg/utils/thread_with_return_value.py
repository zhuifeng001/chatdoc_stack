'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-24 15:33:23
LastEditors: longsion
LastEditTime: 2024-10-15 16:57:35
'''

import threading
import time
from opentelemetry import context as otel_context
from pydantic import BaseModel


class ThreadContext(BaseModel):
    pid: int = -1
    ppids: list[int] = []
    trace_id: str = ""
    st: float = -1
    duration: float = -1
    extra: dict = {}

    # def __repr__(self) -> str:
    #     return f"duration: {self.duration}ms"

    def __str__(self) -> str:
        return f"duration: {self.duration:.1f}ms"


_thread_context = threading.local()


def get_thread_context():
    global _thread_context
    return getattr(_thread_context, "context", None)


def set_thread_context(context: ThreadContext):
    global _thread_context
    setattr(_thread_context, "context", context)


def set_thread_context_by_flask(extra: dict = {}):
    global _thread_context

    if hasattr(_thread_context, "context"):
        _thread_context.context.extra = extra

    else:
        from flask import g
        _thread_context.context = ThreadContext(
            # pid=threading.get_ident(),
            trace_id=getattr(g, "request_id", ""),
            extra=extra
        )


class ThreadWithReturnValue(threading.Thread):
    def __init__(self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None, parent_span_context=None, extra: dict = {}):
        super().__init__(group=group, target=target, name=name, daemon=daemon)
        self.args = args
        self.kwargs = kwargs if kwargs is not None else {}
        self._return = None
        self.exception = None
        self._parent_span_context = parent_span_context or otel_context.get_current()

        global _thread_context

        self._context = ThreadContext()
        if hasattr(_thread_context, "context"):
            # self._context.ppids = _thread_context.context.ppids + [_thread_context.context.pid]
            self._context.trace_id = _thread_context.context.trace_id
            self._context.extra = _thread_context.context.extra

    def run(self):
        try:
            # self._context.pid = threading.get_ident()
            global _thread_context
            _thread_context.context = self._context

            st = time.time()
            self._context.st = st

            if self._target is not None:
                if self._parent_span_context:
                    otel_context.attach(self._parent_span_context)
                    self._return = self._target(*self.args, **self.kwargs)
                else:
                    self._return = self._target(*self.args, **self.kwargs)

            et = time.time()

            self._context.duration = (et - st) * 1000
            from pkg.utils.logger import logger
            logger.debug(f"ThreadWithReturnValue: {self._target.__name__}, {self._context}")
        except Exception as e:
            self.exception = e

    def join(self, *args, **kwargs):
        super().join(*args, **kwargs)
        if self.exception:
            raise self.exception
        return self._return
