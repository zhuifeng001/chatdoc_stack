'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-14 16:04:07
LastEditors: longsion
LastEditTime: 2025-03-09 08:14:40
'''

import heapq
import numpy as np
import requests
import time
import pypeln as pl

from app.objects.vector import TextWithoutVecEntity, VectorEntity, PersonalTextWithoutVecEntity, PersonalVectorEntity

from app.utils.logger import log_msg, logger
from app.utils.lru_cache import LRUCacheDict
from app.utils.utils import retry_exponential_backoff, batch_generator, batch_generator_with_index
from app.config import config

EMBEDDING_URL = config["textin"]["embedding_url"]
BATCH_SIZE = int(config["embedding"]["batch_size"])
PARALLELS = int(config["embedding"]["parallels"])


@retry_exponential_backoff()
def acge_embedding(text, dimension=1024, digit=8):
    import requests

    json_text = {
        "input": [text],
        "matryoshka_dim": dimension,
        "digit": digit,
    }

    headers = {
        "x-ti-app-id": config["textin"]["app_id"],
        "x-ti-secret-code": config["textin"]["app_secret"],
    }

    completion = requests.post(url=EMBEDDING_URL, json=json_text, headers=headers)
    completion.raise_for_status()
    return completion.json()["result"]["embedding"][0]


@retry_exponential_backoff()
def acge_embedding_multi(text_list, dimension=1024, digit=8, headers=None):
    st = time.time()
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

    completion = requests.post(url=EMBEDDING_URL,
                               headers=headers or None,
                               json=json_text)
    completion.raise_for_status()
    et = time.time()
    logger.info(f"acge_embedding_multi 请求成功，耗时{et - st:.2f}s")
    return completion.json()["result"]["embedding"]


@retry_exponential_backoff()
def acge_embedding_multi_by_entities(text_entity_list: list[TextWithoutVecEntity], dimension=1024, digit=8, headers=None):
    st = time.time()
    json_text = {
        "input": [x.text for x in text_entity_list],
        "matryoshka_dim": dimension,
        "digit": digit
    }

    headers = headers or {}
    headers.update({
        "x-ti-app-id": config["textin"]["app_id"],
        "x-ti-secret-code": config["textin"]["app_secret"],
    })

    completion = requests.post(url=EMBEDDING_URL,
                               headers=headers or None,
                               json=json_text)
    completion.raise_for_status()
    et = time.time()
    logger.info(f"acge_embedding_multi 请求成功，耗时{et - st:.2f}s")
    return [
        VectorEntity(file_uuid=text_entity.file_uuid, uuid=text_entity.uuid, vector=embedding)
        for embedding, text_entity in zip(completion.json()["result"]["embedding"], text_entity_list)
    ]


@retry_exponential_backoff()
def acge_embedding_multi_by_personal_entities(text_entity_list: list[PersonalTextWithoutVecEntity], dimension=1024, digit=8, headers=None):
    st = time.time()
    json_text = {
        "input": [x.text for x in text_entity_list],
        "matryoshka_dim": dimension,
        "digit": digit
    }

    headers = headers or {}
    headers.update({
        "x-ti-app-id": config["textin"]["app_id"],
        "x-ti-secret-code": config["textin"]["app_secret"],
    })

    completion = requests.post(url=EMBEDDING_URL,
                               headers=headers or None,
                               json=json_text)
    completion.raise_for_status()
    et = time.time()
    avg_token = sum([len(text.text) for text in text_entity_list]) // len(text_entity_list) if text_entity_list else 0
    logger.info(f"acge_embedding_multi 请求成功，大小: {len(text_entity_list)}, 平均长度: {avg_token},  耗时: {1000*(et - st):.1f}ms")
    return [
        PersonalVectorEntity(
            file_uuid=text_entity.file_uuid,
            uuid=text_entity.uuid,
            vector=embedding,
            user_id=text_entity.user_id
        )
        for embedding, text_entity in zip(completion.json()["result"]["embedding"], text_entity_list)
    ]


@log_msg
def parallel_query(texts: list[str], batch_size=BATCH_SIZE, parallels=PARALLELS):
    logger.info(f"Total {len(texts)}.")

    st = time.time()

    results = batch_generator_with_index(texts, batch_size) | pl.thread.map(
        lambda x: (x[0], acge_embedding_multi(x[1])), workers=parallels, maxsize=parallels) | list
    et = time.time()

    logger.info(f"Total embedding time: {et - st:.2f}s")

    results.sort(key=lambda x: x[0], reverse=False)
    return [result for _, result in results]


acg_lru_cache = LRUCacheDict(max_size=5000, expiration=3 * 24 * 60 * 60)


def embedding_with_cache(texts: list[str]):
    result = []
    to_request = []
    request_indices = []

    # 检查每个输入是否在缓存中
    for i, text in enumerate(texts):
        try:
            result.append(acg_lru_cache[text])
        except Exception:
            # 需要请求的加入列表
            to_request.append(text)
            request_indices.append(i)
            result.append(None)  # 占位符

    # 如果有未缓存的项，进行批处理请求
    if to_request:
        batched_results = [y for x in parallel_query(to_request) for y in x]
        # 填充结果到正确的位置
        for idx, res in zip(request_indices, batched_results):
            cache_key = texts[i]
            acg_lru_cache[cache_key] = res
            result[idx] = res

    return result


def get_similar_top_n(texts: list[str], sentence: str, dimension=1024, top_n=1):
    '''
    给定一组文本和embedding_url，计算输入文本与每个文本的相似度，返回topN个文本
    '''
    if not texts:
        return []

    new_texts = texts + [sentence]
    texts_vec = embedding_with_cache(new_texts)
    sentence_embedding = texts_vec[-1]
    texts_vec = texts_vec[:-1]

    similarity_2d_list = (np.array([sentence_embedding]) @ np.array(texts_vec).T).tolist()
    if not similarity_2d_list:
        return []

    similarity_list = similarity_2d_list[0]
    topk_index = heapq.nlargest(top_n, range(len(similarity_list)), similarity_list.__getitem__)

    return [
        (texts[i], np.round(similarity_list[i], 4)) for i in topk_index
    ]
