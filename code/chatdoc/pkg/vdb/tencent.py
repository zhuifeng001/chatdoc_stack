'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-06-14 11:22:50
LastEditors: longsion
LastEditTime: 2024-10-17 14:51:55
'''

import time
from pkg.config import config
from pkg.doc.objects import VectorEntity
from pkg.utils.logger import logger

from tcvectordb.model.enum import ReadConsistency
import tcvectordb
from tcvectordb.model.document import Filter, SearchParams
from tcvectordb.exceptions import ServerInternalError
from tenacity import retry, stop_after_attempt, stop_after_delay


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


@retry(stop=(stop_after_attempt(3) | stop_after_delay(1)), retry_error_callback=lambda x: False)
def insert_entities(file_uuid, ins_entities: list[VectorEntity]):
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
        logger.info(f"Tencent VDB insert file_uuid: {file_uuid}, batch_size: {len(ins_entities)}, ins_rt: {1000*ins_rt:.1f}ms")
        return True

    except Exception as e:
        if isinstance(e, ServerInternalError) and e.code == 17505:
            raise e

        logger.error(f"Tencent VDB insert error, file_uuid: {file_uuid}, error: {e}")
        import traceback
        traceback.print_exc()
        return False


@retry(stop=(stop_after_attempt(3) | stop_after_delay(1)), retry_error_callback=lambda x: False)
def delete_entities(file_uuid):
    try:
        t0 = time.time()
        res = get_tencent_client().delete(
            database_name=DATABASE,
            collection_name=COLLECTION_NAME,
            filter=Filter(f"file_uuid = \"{file_uuid}\"")
        )
        rt = time.time() - t0
        logger.info(res)
        logger.info(f"Tencent VDB delete file_uuid: {file_uuid}, rt: {1000*rt:.1f}ms")
        return True
    except Exception as e:
        if isinstance(e, ServerInternalError) and e.code == 17505:
            raise e

        logger.error(f"Tencent VDB delete error, file_uuid: {file_uuid} {e}")
        import traceback
        traceback.print_exc()
        return False


@retry(stop=(stop_after_attempt(3) | stop_after_delay(1)), retry_error_callback=lambda x: False)
def delete_entities_by_uuids(file_uuids):
    try:
        t0 = time.time()
        res = get_tencent_client().delete(
            database_name=DATABASE,
            collection_name=COLLECTION_NAME,
            filter=Filter(Filter.In("file_uuid", file_uuids))
        )
        rt = time.time() - t0
        logger.info(res)
        logger.info(f"Tencent VDB delete file_uuids: {file_uuids}, rt: {rt*1000:.1f}ms")
        return True
    except Exception as e:
        if isinstance(e, ServerInternalError) and e.code == 17505:
            raise e

        logger.error(f"Tencent VDB delete error, file_uuids: {file_uuids} {e}")
        import traceback
        traceback.print_exc()
        return False


@retry(stop=(stop_after_attempt(3) | stop_after_delay(1)), retry_error_callback=lambda x: False)
def delete_personal_entities(user_id, file_uuids):
    try:
        t0 = time.time()
        res = get_tencent_client().delete(
            database_name=DATABASE,
            collection_name=P_COLLECTION_NAME,
            filter=Filter(f'user_id = "{user_id}"').And(Filter.In("file_uuid", file_uuids))
        )
        rt = time.time() - t0
        logger.info(res)
        logger.info(f"Tencent VDB delete user_id: {user_id}, file_uuids: {file_uuids}, rt: {1000*rt:.1f}ms")
        return True
    except Exception as e:
        if isinstance(e, ServerInternalError) and e.code == 17505:
            raise e

        logger.error(f"Tencent VDB delete error,user_id: {user_id}, file_uuids: {file_uuids}, {e}")
        import traceback
        traceback.print_exc()
        return False


@retry(stop=(stop_after_attempt(3) | stop_after_delay(1)), reraise=True)
def search_personal(size: int, file_uuids: list[str], question_embedding: list[float], user_id=None):
    start_time = time.time()
    if file_uuids and user_id:
        _filter = Filter(f'user_id = "{user_id}"').And(Filter.In("file_uuid", file_uuids))

    elif user_id:
        _filter = Filter(f'user_id = "{user_id}"')

    elif file_uuids:
        _filter = Filter(Filter.In("file_uuid", file_uuids))

    else:
        _filter = None

    search_resp = get_tencent_client().search(
        database_name=DATABASE,
        collection_name=P_COLLECTION_NAME,
        vectors=[question_embedding],
        params=SearchParams(nprobe=80),
        output_fields=["id", "file_uuid"],
        limit=size,
        filter=_filter,
    )
    end_time = time.time()  # 结束计时
    logger.info(f"VDB: tencent_search cost:  {(end_time - start_time)*1000:.1f}ms, count: {len(search_resp[0]) if search_resp else 0}")

    return search_resp


@retry(stop=(stop_after_attempt(3) | stop_after_delay(1)), reraise=True)
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
    logger.info(f"VDB: tencent_search cost:  {(end_time - start_time)*1000:.1f}ms, count: {len(search_resp[0]) if search_resp else 0}")

    return search_resp
