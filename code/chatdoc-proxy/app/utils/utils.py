'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-03-29 17:27:46
LastEditors: longsion
LastEditTime: 2024-07-16 23:23:20
'''
import hashlib
import os
from functools import wraps
import requests
import time
from app.utils.logger import logger


def md5(content):
    md5_obj = hashlib.md5()
    md5_obj.update(content)
    file_md5 = md5_obj.hexdigest()
    return file_md5


def read_file(path):
    with open(path, 'rb') as f:
        return f.read()


def save_file(path, content):
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    with open(path, "wb") as f:
        f.write(content)


def retry_exponential_backoff(max_retries=3, base_delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.RequestException as e:
                    wait_time = base_delay * (2 ** retries)
                    logger.warning(f"请求失败，{wait_time}秒后重试...{e}")
                    time.sleep(wait_time)
                    retries += 1
            logger.exception('达到最大重试次数，请求失败')
            raise Exception("达到最大重试次数，请求失败")

        return wrapper

    return decorator


def batch_generator(iterator, batch_size):
    batch = []
    iterator = iter(iterator)
    try:
        while True:
            for _ in range(batch_size):
                batch.append(next(iterator))
            yield batch
            batch = []
    except StopIteration:
        if batch:  # 如果最后一个批次不足 batch_size 也返回
            yield batch


def batch_generator_with_index(iterator, batch_size):
    batch = []
    iterator = iter(iterator)

    idx = 0
    try:
        while True:
            for _ in range(batch_size):
                batch.append(next(iterator))
            yield (idx, batch)
            idx += 1
            batch = []
    except StopIteration:
        if batch:  # 如果最后一个批次不足 batch_size 也返回
            yield (idx, batch)


def print_run_time(func):
    """打印函数时间.
    :param func: 调用函数
    :return: 函数返回结果，并打印函数时间
    """

    @ wraps(func)
    def wrapper(*args, **kw):
        local_time = time.time()
        result = func(*args, **kw)
        logger.info('current Function [%s] run time is %.8f' %
                    (func.__name__, time.time() - local_time))
        return result

    return wrapper


def edit_distance(str1, str2):
    m, n = len(str1), len(str2)
    # 创建一个矩阵来存储子问题的解
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # 填充矩阵的第一行和第一列
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    # 通过比较字符并考虑插入、删除和替换操作来填充dp矩阵
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if str1[i - 1] == str2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j],    # 删除
                                   dp[i][j - 1],    # 插入
                                   dp[i - 1][j - 1])  # 替换

    return dp[m][n]


def ensure_list(item):
    if item is None:
        return []
    if isinstance(item, list):
        return item

    return [item]
