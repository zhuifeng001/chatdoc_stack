'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-09-24 16:48:05
LastEditors: longsion
LastEditTime: 2025-03-05 20:06:59
'''


import time
from app.config import config
from app.utils.logger import logger
from app.objects.vector import VectorEntity, PersonalVectorEntity

import tcvectordb
from tcvectordb.model.enum import ReadConsistency
from tcvectordb.model.document import Filter, SearchParams


DATABASE = config["tencent"]["database"]
COLLECTION_NAME = config["tencent"]["collection"]
P_COLLECTION_NAME = config["tencent"]["p_collection"]


tencent_client = None


def get_tencent_client():
    global tencent_client
    if not tencent_client:
        tencent_client = tcvectordb.VectorDBClient(
            url=config["tencent"]["uri"],
            username=config["tencent"]["username"],
            key=config["tencent"]["key"],
            read_consistency=ReadConsistency.EVENTUAL_CONSISTENCY,
            timeout=30)
    return tencent_client


def insert_entities(ins_entities: list[VectorEntity]):
    try:
        t0 = time.time()
        logger.info(f"Tencent VDB start insert batch_size {len(ins_entities)}")
        get_tencent_client().upsert(
            database_name=DATABASE,
            collection_name=COLLECTION_NAME,
            documents=[
                dict(id=ins_entity.uuid,
                     vector=ins_entity.vector,
                     file_uuid=ins_entity.file_uuid) for ins_entity in ins_entities
            ],
            build_index=True,
        )
        ins_rt = time.time() - t0
        logger.info(f"Tencent VDB insert batch_size {len(ins_entities)}, ins_rt: {1000*ins_rt:.1f}ms")
        return True
    except Exception as e:
        file_uuids = list(set([c.file_uuid for c in ins_entities]))
        logger.exception(f"Tencent VDB insert error: {file_uuids} {e}")
        import traceback
        traceback.print_exc()
        return False


def insert_personal_entities(ins_entities: list[PersonalVectorEntity]):
    try:
        t0 = time.time()
        logger.info(f"Tencent VDB start insert batch_size {len(ins_entities)}")
        get_tencent_client().upsert(
            database_name=DATABASE,
            collection_name=P_COLLECTION_NAME,
            documents=[
                dict(id=ins_entity.uuid,
                     vector=ins_entity.vector,
                     file_uuid=ins_entity.file_uuid,
                     user_id=ins_entity.user_id) for ins_entity in ins_entities
            ],
            build_index=True,
        )
        ins_rt = time.time() - t0
        logger.info(f"Tencent VDB insert batch_size {len(ins_entities)}, ins_rt: {1000*ins_rt:.1f}ms")
        return True
    except Exception as e:
        file_uuids = list(set([c.file_uuid for c in ins_entities]))
        logger.exception(f"Tencent VDB insert error: {file_uuids} {e}")
        import traceback
        traceback.print_exc()
        return False


def search_analyst(size: int, file_uuids: list[str], question_embedding: list[float]):
    start_time = time.time()
    if file_uuids:
        _filter = Filter(Filter.In("file_uuid", file_uuids))
    else:
        _filter = None

    search_resp = get_tencent_client().search(
        database_name=DATABASE,
        collection_name=COLLECTION_NAME,
        vectors=[question_embedding],
        params=SearchParams(nprobe=80),
        output_fields=["id", "file_uuid"],
        limit=size,
        filter=_filter,
    )
    end_time = time.time()  # 结束计时
    logger.info(f"tencent_search cost:  {end_time - start_time:.4f}s")

    return search_resp
