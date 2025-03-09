'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-06-13 18:09:00
LastEditors: longsion
LastEditTime: 2025-03-05 20:07:31
'''

import time
from app.config import config
from pymilvus import MilvusClient

from app.utils.logger import logger

from app.objects.vector import VectorEntity, PersonalVectorEntity

COLLECTION_NAME = config["zilliz"]["collection"]
P_COLLECTION_NAME = config["zilliz"]["p_collection"]

milvus_client = None


def get_milvus_client():
    global milvus_client
    if not milvus_client:
        milvus_client = MilvusClient(uri=config["zilliz"]["uri"], token=config["zilliz"]["token"])
    return milvus_client


def insert_entities(ins_entities: list[VectorEntity]):
    try:
        t0 = time.time()
        logger.info(f"Zilliz start insert batch_size {len(ins_entities)}")
        get_milvus_client().insert(collection_name=COLLECTION_NAME, data=[item.model_dump() for item in ins_entities])
        ins_rt = time.time() - t0
        logger.info(f"Zilliz insert batch_size {len(ins_entities)}, ins_rt: {ins_rt}")
        return True
    except Exception as e:
        file_uuids = list(set([c.file_uuid for c in ins_entities]))
        logger.exception(f"Zilliz insert error: {file_uuids} {e}")
        import traceback
        traceback.print_exc()
        return False


def insert_personal_entities(ins_entities: list[PersonalVectorEntity]):
    try:
        t0 = time.time()
        logger.info(f"Zilliz start insert batch_size {len(ins_entities)}")
        get_milvus_client().insert(collection_name=P_COLLECTION_NAME, data=[item.model_dump() for item in ins_entities])
        ins_rt = time.time() - t0
        logger.info(f"Zilliz insert batch_size {len(ins_entities)}, ins_rt: {ins_rt}")
        return True
    except Exception as e:
        file_uuids = list(set([c.file_uuid for c in ins_entities]))
        logger.exception(f"Zilliz insert error: {file_uuids} {e}")
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
    logger.info(f"zilliz_search cost:  {end_time - start_time:.4f}s")

    return search_resp
