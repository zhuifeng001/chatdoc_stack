'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-17 11:00:09
LastEditors: longsion
LastEditTime: 2024-04-26 10:58:28
'''


from pkg.utils.lru_cache import LRUCacheDict, LRUCachedFunction, BatchCacheManager
from pkg.config import config
from pkg.utils import global_thread_pool, retry_exponential_backoff


@retry_exponential_backoff()
def peg_embedding(text):
    import requests

    json_text = {
        "input": [text]
    }

    url = config["parse"]["peg_embedding_url"]
    completion = requests.post(url=url, json=json_text)
    completion.raise_for_status()
    return completion.json()["result"]["embedding"][0]


peg_lru_cache = LRUCacheDict(max_size=5000, expiration=60 * 60)
peg_embedding_with_cache = LRUCachedFunction(peg_embedding, cache=peg_lru_cache)


@retry_exponential_backoff()
def peg_embedding_multi(text_list, headers=None, url=None):
    import requests

    json_text = {
        "input": text_list
    }
    completion = requests.post(url=url or config["parse"]["peg_embedding_url"],
                               headers=headers or None,
                               json=json_text)
    completion.raise_for_status()
    return completion.json()["result"]["embedding"]


peg_embedding_multi_batch_with_cache = BatchCacheManager(peg_embedding_multi, cache=peg_lru_cache, batch_size=32, cache_key_suffix="peg_embedding", thread_pool=global_thread_pool)
