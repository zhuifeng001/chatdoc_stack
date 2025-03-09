'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-10-14 15:34:15
LastEditors: longsion
LastEditTime: 2024-10-16 14:39:10
'''


# 创建一个logger
import os
from pkg.utils.thread_with_return_value import get_thread_context
import logging
logger = logging.getLogger(__name__)

log_level = logging.INFO if os.environ.get("LOG_LEVEL") != "DEBUG" else logging.DEBUG
logger.setLevel(log_level)


# 创建一个handler，用于写入控制台
ch = logging.StreamHandler()
ch.setLevel(log_level)


# 创建一个formatter，用于设定日志格式
formatter = logging.Formatter('%(asctime)s - %(trace_id)s  - %(levelname)s - %(message)s')
ch.setFormatter(formatter)


class TraceIdFilter(logging.Filter):
    def filter(self, record):
        context = get_thread_context()
        if context:
            record.trace_id = context.trace_id
        else:
            record.trace_id = ''
        return True


logger.addFilter(TraceIdFilter())


# 给logger添加handler
logger.addHandler(ch)
