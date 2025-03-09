'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-25 16:24:15
LastEditors: longsion
LastEditTime: 2024-10-15 16:53:47
'''


import time
import json
import datetime
import traceback
from functools import wraps

from pydantic import BaseModel
from pkg.utils.logger import logger
from pkg.utils.jaeger import tracer
from enum import Enum


class CustomerEncoder(json.JSONEncoder):

    def default(self, obj):
        if isinstance(obj, Enum):
            return obj.value
        return super().default(obj)


def register_span_func(func_name: str = None, span_export_func: callable = None, update_durations=True):
    def decorator(func):

        @wraps(func)
        def wrapper(*args, **kwargs):
            __func_name_ = func_name or func.__name__
            with tracer.start_as_current_span(__func_name_) as span:
                start_time = time.time()
                # 开始计时
                start_time_str = str(datetime.datetime.now())
                try:
                    # export span trace
                    result = func(*args, **kwargs)
                    # if span_export_func:
                    #     span_attributes = {f"chatdoc.{key}": json.dumps(val, ensure_ascii=False, cls=CustomerEncoder) for key, val in span_export_func(result).items()}
                    #     span.set_attributes(span_attributes)

                    return result
                except Exception as e:
                    # 记录异常到日志
                    logger.error(f"Error in {__func_name_}: {e}, traceback: {traceback.format_exc()}")
                    raise e  # 可选择重新抛出异常或处理异常
                finally:
                    end_time = time.time()  # 结束计时
                    logger.info(f"Span: {__func_name_} start at {start_time_str}, duration: {(end_time - start_time)*1000:.1f}ms")

                    if update_durations:
                        if "context" in kwargs:
                            context = kwargs.get("context")
                        else:
                            context = args[0] if args else None

                        if context and isinstance(context, BaseModel) and hasattr(context, "durations") and isinstance(context.durations, dict) and hasattr(context, "start_ts"):
                            context.durations.update(
                                {
                                    func_name: dict(start=f"{(start_time - context.start_ts)*1000:.1f}ms", duration=f"{(end_time - start_time) * 1000:.1f}ms")
                                }
                            )

        return wrapper

    return decorator
