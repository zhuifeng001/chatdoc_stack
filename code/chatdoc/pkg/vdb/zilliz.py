'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-06-13 18:09:00
LastEditors: longsion
LastEditTime: 2025-03-05 20:03:25
'''

import time
from pkg.config import config
from pkg.utils.logger import logger
from pymilvus import MilvusClient

from pkg.doc.objects import VectorEntity

COLLECTION_NAME = config["zilliz"]["collection"]
P_COLLECTION_NAME = config["zilliz"]["p_collection"]

milvus_client = None


def get_milvus_client():
    global milvus_client
    if not milvus_client:
        milvus_client = MilvusClient(uri=config["zilliz"]["uri"], token=config["zilliz"]["token"])
    return milvus_client


def insert_entities(file_uuid, ins_entities: list[VectorEntity]):
    try:
        t0 = time.time()
        logger.info(f"Zilliz start insert batch_size {len(ins_entities)}")
        get_milvus_client().insert(collection_name=COLLECTION_NAME, data=[item.model_dump() for item in ins_entities])
        ins_rt = time.time() - t0
        logger.info(f"Zilliz insert batch_size {len(ins_entities)}, ins_rt: {ins_rt}")
        return True
    except Exception as e:
        logger.error(f"Zilliz insert error: {file_uuid} {e}")
        import traceback
        traceback.print_exc()
        return False


def delete_entities(file_uuid):
    try:
        t0 = time.time()
        res = get_milvus_client().delete(
            collection_name=COLLECTION_NAME,
            filter=f'file_uuid == "{file_uuid}"'
        )
        ins_rt = time.time() - t0
        logger.info(res)
        logger.info(f"Zilliz delete {file_uuid}, ins_rt: {ins_rt}")
        return True
    except Exception as e:
        logger.error(f"Zilliz delete error: {file_uuid} {e}")
        import traceback
        traceback.print_exc()
        return False


def delete_entities_by_uuids(file_uuids):
    try:
        t0 = time.time()
        res = get_milvus_client().delete(
            collection_name=COLLECTION_NAME,
            filter=f'file_uuid in {file_uuids}'
        )
        ins_rt = time.time() - t0
        logger.info(res)
        logger.info(f"Zilliz delete {file_uuids}, ins_rt: {ins_rt}")
        return True
    except Exception as e:
        logger.error(f"Zilliz delete error: {file_uuids} {e}")
        import traceback
        traceback.print_exc()
        return False


def delete_personal_entities(user_id, file_uuids):
    try:
        t0 = time.time()
        res = get_milvus_client().delete(
            collection_name=P_COLLECTION_NAME,
            filter=f'file_uuid in {file_uuids} and user_id == "{user_id}"'
        )
        ins_rt = time.time() - t0
        logger.info(res)
        logger.info(f"Zilliz delete {user_id}, {file_uuids}, ins_rt: {ins_rt}")
        return True
    except Exception as e:
        logger.error(f"Zilliz delete error: {user_id}, {file_uuids}, {e}")
        import traceback
        traceback.print_exc()
        return False


def search_analyst(size: int, file_uuids: list[str], question_embedding: list[float]):
    start_time = time.time()
    filter_str = f"file_uuid in {file_uuids}" if file_uuids else ""
    search_resp = get_milvus_client().search(
        collection_name=COLLECTION_NAME,
        data=[question_embedding],
        output_fields=["uuid", "file_uuid"],
        limit=size,
        filter=filter_str
    )
    end_time = time.time()  # 结束计时
    logger.info(f"zilliz_search cost:  {1000*(end_time - start_time):.1f}ms")

    return search_resp


def search_personal(size: int, file_uuids: list[str], question_embedding: list[float], user_id=None):
    start_time = time.time()
    filter_str = f"file_uuid in {file_uuids}" if file_uuids else ""
    if user_id:
        if filter_str:
            filter_str += f" and user_id == '{user_id}'"
        else:
            filter_str = f"user_id == '{user_id}'"
    search_resp = get_milvus_client().search(
        collection_name=P_COLLECTION_NAME,
        data=[question_embedding],
        output_fields=["uuid", "file_uuid"],
        limit=size,
        filter=filter_str
    )
    end_time = time.time()  # 结束计时
    logger.info(f"zilliz_search cost:  {1000*(end_time - start_time):.1f}ms")

    return search_resp


# 根据标量查询
def query_entities(file_uuid):
    res = get_milvus_client().query(
        collection_name=COLLECTION_NAME,
        output_fields=["uuid", "file_uuid"],
        offset=0,
        limit=16384,  # 最大
        filter=f'file_uuid == "{file_uuid}"'
        # filter=f"file_uuid in {[file_uuid]}" # 速度慢一档
    )
    return res


if __name__ == "__main__":
    query_entities("15b6c748eb3069c1bf8ebef68625163c")
