'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-04 22:09:38
LastEditors: longsion
LastEditTime: 2024-10-17 16:58:28
'''

import pypeln as pl
import requests
from pkg.config import config
from pkg.utils.decorators import register_span_func
from pkg.utils.generator import batch_generator
from .objects import Context, Fragment
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.es.es_p_doc_fragment import PDocFragmentES, PDocFragmentModel
from pkg.utils.logger import logger


@register_span_func(func_name="段落切片上报", span_export_func=lambda context: dict(
    params=context.params.model_dump(),
    trace_id=context.trace_id,
    len_doc_fragments=len(context.doc_fragments),
))
def upload_paragragh_fragment(context: Context) -> Context:
    """
    段落切片数据上报
    row_texts: 段落切片逻辑
    """
    from pkg.vdb import delete_personal_vdb

    file_uuid = context.params.uuid

    # 删除老切片
    es_fragment_t = ThreadWithReturnValue(target=_delete_and_insert_es_fragments, args=(file_uuid, context.doc_fragments, context.params.user_id))
    es_fragment_t.start()

    # 删除老向量
    delete_vbd_t = ThreadWithReturnValue(target=delete_personal_vdb, args=(context.params.user_id, [file_uuid]))
    delete_vbd_t.start()

    # multi_embedding and upload to es
    embedding_zilliz_t = ThreadWithReturnValue(target=embedding_and_upload, args=(context.doc_fragments, file_uuid, context.params.user_id))
    embedding_zilliz_t.start()

    for t in [es_fragment_t, delete_vbd_t, embedding_zilliz_t]:
        context.threads.append(t)
        t.join()
        # 加入到context.threads，方便后面判断成功与否

    return context


def _delete_and_insert_es_fragments(file_uuid, doc_fragments: list[Fragment], user_id: str):
    try:
        PDocFragmentES().delete_by_user_and_file_uuids(user_id, [file_uuid], wait_delete=True)
        _f_items = [PDocFragmentModel(**item.model_dump(), file_uuid=file_uuid, user_id=user_id) for item in doc_fragments]
        insert_result = PDocFragmentES().insert_doc_fragments(_f_items)
        logger.info(f"delete and insert es fragments succeed, file_uuid: {file_uuid}, fragment_count: {len(doc_fragments)}")
        return insert_result
    except Exception as e:
        logger.error(f"delete and insert es fragments error: {e}")
        return False


@ register_span_func()
def embedding_and_upload(doc_fragments: list[Fragment], file_uuid: str, user_id: str):
    vector_params = [
        dict(
            file_uuid=file_uuid,
            uuid=doc_fragment.uuid,
            text=doc_fragment.ebed_text,
            user_id=user_id,
        )
        for doc_fragment in doc_fragments
    ]
    url = config["proxy"]["url"]
    batch_generator(vector_params, 320) | pl.thread.map(
        lambda x: requests.post(f"{url}/vector/upload_personal", json=x), workers=12) | list

    return True
