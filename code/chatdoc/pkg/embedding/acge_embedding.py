'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-17 10:56:43
LastEditors: longsion
LastEditTime: 2025-03-09 08:13:25
'''

import numpy as np
import heapq
from pkg.utils.lru_cache import LRUCacheDict, LRUCachedFunction, BatchCacheManager
from pkg.config import config
from pkg.utils import global_thread_pool, retry_exponential_backoff


@retry_exponential_backoff()
def acge_embedding(text, dimension=1024, digit=8):
    import requests

    json_text = {
        "input": [text],
        "matryoshka_dim": dimension,
        "digit": digit,
    }
    url = config["textin"]["embedding_url"]
    headers = {
        "x-ti-app-id": config["textin"]["app_id"],
        "x-ti-secret-code": config["textin"]["app_secret"],
    }

    completion = requests.post(url=url, headers=headers, json=json_text)
    completion.raise_for_status()
    return completion.json()["result"]["embedding"][0]


acg_lru_cache = LRUCacheDict(max_size=5000, expiration=60 * 60)
acge_embedding_with_cache = LRUCachedFunction(acge_embedding, acg_lru_cache, cache_key_suffix="acge_embedding")


@retry_exponential_backoff()
def acge_embedding_multi(text_list, dimension=1024, digit=8, headers=None, url=None):
    import requests

    json_text = {
        "input": text_list,
        "matryoshka_dim": dimension,
        "digit": digit
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


acg_embedding_multi_batch_with_cache = BatchCacheManager(acge_embedding_multi, cache=acg_lru_cache, batch_size=16, cache_key_suffix="acge_embedding", thread_pool=global_thread_pool)


def get_similar_top_n(texts: list[str], sentence: str, dimension=1024, top_n=1):
    '''
    给定一组文本和embedding_url，计算输入文本与每个文本的相似度，返回topN个文本
    '''
    if not texts:
        return []
    texts_vec = acg_embedding_multi_batch_with_cache(texts, dimension=dimension)
    sentence_embedding = acge_embedding_with_cache(sentence, dimension=dimension)
    similarity_2d_list = (np.array([sentence_embedding]) @ np.array(texts_vec).T).tolist()

    if not similarity_2d_list:
        return []

    similarity_list = similarity_2d_list[0]
    topk_index = heapq.nlargest(top_n, range(len(similarity_list)), similarity_list.__getitem__)

    return [
        (texts[i], np.round(similarity_list[i], 4)) for i in topk_index
    ]


def get_similar(texts: list[str], sentence: str, dimension=1024):
    '''
    给定一组文本和embedding_url，计算输入文本与每个文本的相似度，返回topN个文本
    '''
    if not texts:
        return []
    texts_vec = acg_embedding_multi_batch_with_cache(texts, dimension=dimension)
    sentence_embedding = acge_embedding_with_cache(sentence, dimension=dimension)
    similarity_2d_list = (np.array([sentence_embedding]) @ np.array(texts_vec).T).tolist()

    if not similarity_2d_list:
        return []

    return similarity_2d_list
