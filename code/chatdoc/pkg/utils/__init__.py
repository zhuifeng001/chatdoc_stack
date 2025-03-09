'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-24 15:37:47
LastEditors: longsion
LastEditTime: 2025-03-09 08:13:43
'''
from pkg.config import config
from pkg.utils.jaeger import TracedThreadPoolExecutor
from pkg.utils.logger import logger
import requests
from functools import wraps
import time
import re
import numpy as np
import json
import os
import hashlib
from io import BytesIO
import gzip
import math


def md5(content):
    md5_obj = hashlib.md5()
    md5_obj.update(content)
    file_md5 = md5_obj.hexdigest()
    return file_md5


global_thread_pool = TracedThreadPoolExecutor(max_workers=config["threadpool"]["global_worker"])
global_file_thread_pool = TracedThreadPoolExecutor(max_workers=config["threadpool"]["doc_process_worker"])


def print_run_time(func):
    """打印函数时间.
    :param func: 调用函数
    :return: 函数返回结果，并打印函数时间
    """

    @wraps(func)
    def wrapper(*args, **kw):
        local_time = time.time()
        result = func(*args, **kw)
        logger.info('current Function [%s] run time is %.8f' %
                    (func.__name__, time.time() - local_time))
        return result

    return wrapper


def save_file(path, content):
    if not os.path.exists(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    with open(path, "wb") as f:
        f.write(content)


def top_p(retrieval_infos, top_p_score):
    top_p_score_this, results = 0.0, []
    for retrieval_info in retrieval_infos:
        if top_p_score >= top_p_score_this:
            results.append(retrieval_info)
            top_p_score_this += retrieval_info['rank_score']
        else:
            break
    return results


def retry_exponential_backoff(max_retries=3, base_delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            func_name = func.__name__
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.RequestException as e:
                    wait_time = base_delay * (2 ** retries)
                    logger.warning(f"{func_name}请求失败，{wait_time}秒后重试...{e}")
                    logger.warning(f"{func_name}正在尝试第{retries + 1}次请求")
                    time.sleep(wait_time)
                    retries += 1
            logger.error(f'{func_name}达到最大重试次数，请求失败')
            raise Exception(f"{func_name}达到最大重试次数，请求失败")

        return wrapper

    return decorator


@retry_exponential_backoff()
def embedding_multi(origin_text, headers=None, url=None):
    json_text = {
        "input": origin_text
    }

    headers = headers or {}
    headers.update({
        "x-ti-app-id": config["textin"]["app_id"],
        "x-ti-secret-code": config["textin"]["app_secret"],
    })

    completion = requests.post(url=url or config["textin"]["embedding_url"],
                               headers=headers or None,
                               json=json_text)
    completion.raise_for_status()
    return completion.json()["result"]["embedding"]


def log_msg(func):
    @wraps(func)
    def with_logging(*args, **kwargs):
        start_time = time.time()
        ret = func(*args, **kwargs)
        logger.info(f"{func.__name__} step successfully total spend: {(time.time() - start_time)*1000:.1f}ms")
        return ret

    return with_logging


def has_intersection_list(list1, list2):
    '''判断两个列表是否有交集'''
    # 将列表转换为集合
    set1 = set(list1)
    set2 = set(list2)
    # 计算交集
    intersection = set1.intersection(set2)
    # 判断是否有交集
    return len(intersection) > 0


def is_subsequence(s1, s2):
    '''判断s1是否是s2的子序列'''
    it = iter(s2)
    return all(c in it for c in s1)


def remove_symbol(text):
    '''去除标点符号'''
    # 定义一个正则表达式，匹配所有英文和中文标点符号
    pattern = r'[^\w\s\u4e00-\u9fff]'

    # 使用re.sub()函数替换所有标点符号为空字符串
    return re.sub(pattern, '', text)


def duplicates_list(items, item_func=lambda x: x):
    """
    简单列表去重
    """
    new_items = []
    new_set = set()

    for item in items:
        key = hash(item_func(item))
        if key not in new_set:
            new_set.add(key)
            new_items.append(item)

    return new_items


def softmax(x) -> list[float]:
    if not x:
        return []

    e_x = np.exp(x - np.max(x))  # 防止指数溢出
    return (e_x / np.sum(e_x)).tolist()


def soft_sort(score_list, tv):
    if not score_list:
        return 0

    alp = len(score_list)**2
    new_score_list = softmax(np.array(score_list) * alp)
    # 排序逻辑，前n-1个阈值相加不超过tv
    n = 0
    while (n < len(score_list)):
        if sum(new_score_list[:n]) > tv:
            break
        else:
            n += 1
    return n


def read_json(file_path):
    with open(file_path, "r", encoding='utf-8') as f:
        data = f.read()
    return json.loads(data)


def write_json(file_path, data):
    with open(file_path, "w", encoding='utf-8') as f:
        f.write(json.dumps(data, ensure_ascii=False))


def count_time_width_return(name='this'):
    def decorator(func):
        @wraps(func)
        def with_time(*args, **kwargs):
            start_time = time.time()
            ret = func(*args, **kwargs)
            total_time = time.time() - start_time
            logger.warning(f"Spend time on {name} for {total_time} seconds")
            return total_time, ret
        return with_time
    return decorator


@count_time_width_return()
def test_time_fn():
    time.sleep(2)


def groupby(results, group_key):
    from itertools import groupby

    def get_attr(x, key):
        return getattr(x, key) if hasattr(x, key) else x[key]

    return groupby(sorted(results, key=lambda x: get_attr(x, group_key)), key=lambda x: get_attr(x, group_key))


def ensure_list(item):
    if item is None:
        return []
    if isinstance(item, list):
        return item

    return [item]


def compress(data):
    json_bytes = data.encode('utf-8')
    buffer = BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb') as f:
        f.write(json_bytes)
    return buffer.getvalue()


def decompress(gzipped_data):
    buffer = BytesIO(gzipped_data)
    with gzip.GzipFile(fileobj=buffer, mode='rb') as f:
        decompressed_data = f.read()
    return decompressed_data.decode('utf-8', errors='ignore')


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


def group_by_func(entities: list[object], keyfunc: callable) -> list[tuple]:

    groups = []
    group_keys = []
    for entity in entities:
        index_value = keyfunc(entity)
        if index_value not in group_keys:
            groups.append((index_value, [entity]))
            group_keys.append(index_value)
        else:
            rindex = group_keys.index(index_value)
            groups[rindex][1].append(entity)

    return groups


def split_list(input_list, chunk_size):
    """将列表input_list按照chunk_size拆分成多个子列表"""
    # 初始化空子列表的列表
    sublists = []
    # 遍历列表，步长为chunk_size
    for i in range(0, len(input_list), chunk_size):
        # 添加子列表到结果列表中
        sublists.append(input_list[i:i + chunk_size])
    return sublists


def sigmoid(x):
    try:
        return 1 / (1 + math.exp(-x))
    except OverflowError:
        # Handle the case where x is very large and exp(-x) might underflow to 0
        if x > 0:
            return 1.0
        else:
            return 0.0


def plat_call(original_2d_list: list[list], f: callable):
    # 示例代码实现
    # f 接受一维列表作为参数

    # 将二维列表展平为一维列表
    flat_list = [item for sublist in original_2d_list for item in sublist]

    # 记录每个子列表的长度
    sublist_lengths = [len(sublist) for sublist in original_2d_list]

    # 使用函数f处理一维列表中的每个元素
    processed_flat_list = f(flat_list)

    # 根据每个子列表的长度，将处理后的一维列表重构回二维列表
    reconstructed_2d_list = []
    start_index = 0
    for length in sublist_lengths:
        end_index = start_index + length
        sublist = processed_flat_list[start_index:end_index]
        reconstructed_2d_list.append(sublist)
        start_index = end_index

    return reconstructed_2d_list
