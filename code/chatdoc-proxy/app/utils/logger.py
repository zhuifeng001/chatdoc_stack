'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-05 14:48:15
LastEditors: longsion
LastEditTime: 2024-10-18 15:37:03
'''


from functools import wraps
import logging
import time

# 创建一个logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# 创建一个handler，用于写入控制台
ch = logging.StreamHandler()
ch.setLevel(logging.DEBUG)

# 创建一个formatter，用于设定日志格式
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
ch.setFormatter(formatter)


# 给logger添加handler
logger.addHandler(ch)


def log_msg(func):
    @wraps(func)
    def with_logging(*args, **kwargs):
        start_time = time.time()
        ret = func(*args, **kwargs)
        logger.info(f"{func.__name__} duration: {(time.time() - start_time)*1000:.1f}ms")
        return ret

    return with_logging
