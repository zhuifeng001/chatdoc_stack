'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-25 15:55:17
LastEditors: longsion
LastEditTime: 2025-03-09 08:13:37
'''
from pkg.utils import retry_exponential_backoff
from pkg.config import config
from pkg.utils.lru_cache import LRUCacheDict
import requests

rerank_lru_cache = LRUCacheDict(max_size=20000, expiration=60 * 60)


@retry_exponential_backoff()
def rerank_api(pairs, headers=None, url='http://xxxx/rerank', if_softmax=0):
    json_text = {
        "input": pairs,
        "if_softmax": if_softmax
    }

    headers = headers or {}
    headers.update({
        "x-ti-app-id": config["textin"]["app_id"],
        "x-ti-secret-code": config["textin"]["app_secret"],
    })

    completion = requests.post(url=url or config["textin"]["rerank_url"],
                               headers=headers or None,
                               json=json_text)
    completion.raise_for_status()
    return completion.json()["rerank_score"]


def rerank_api_by_cache(pairs, headers=None, url='http://xxxx/rerank', if_softmax=0):
    text1_list, text2_list = pairs[0], pairs[1]

    result = []
    to_request_text2_list = []
    request_indices = []
    for i, text_2 in enumerate(text2_list):
        cache_key = text1_list[0] + '##' + text_2
        try:
            result.append(rerank_lru_cache[cache_key])

        except KeyError:
            to_request_text2_list.append(text_2)
            request_indices.append(i)
            result.append(None)  # 占位符

    if to_request_text2_list:
        rerank_scores = rerank_api([text1_list, to_request_text2_list], headers=headers, url=url, if_softmax=if_softmax)
        for idx, rerank_score in zip(request_indices, rerank_scores):
            cache_key = text1_list[0] + '##' + text2_list[idx]
            rerank_lru_cache[cache_key] = rerank_score
            result[idx] = rerank_score

    return result
