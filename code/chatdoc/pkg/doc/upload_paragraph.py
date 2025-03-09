'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-04 22:09:38
LastEditors: longsion
LastEditTime: 2024-10-16 15:48:23
'''

import pypeln as pl
import requests
from pkg.config import config
from pkg.utils.decorators import register_span_func
from pkg.utils.generator import batch_generator
from .objects import Context, Fragment
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.es.es_doc_fragment import DocFragmentES, DocFragmentModel
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
    from pkg.vdb import delete_vdb

    file_uuid = context.params.uuid

    # 删除老切片
    es_fragment_t = ThreadWithReturnValue(target=_delete_and_insert_es_fragments, args=(file_uuid, context.doc_fragments))
    es_fragment_t.start()

    # 删除老向量
    delete_vbd_t = ThreadWithReturnValue(target=delete_vdb, args=(file_uuid,))
    delete_vbd_t.start()

    # multi_embedding and upload to es
    embedding_zilliz_t = ThreadWithReturnValue(target=embedding_and_upload, args=(context.doc_fragments, file_uuid))
    embedding_zilliz_t.start()

    for t in [es_fragment_t, delete_vbd_t, embedding_zilliz_t]:
        context.threads.append(t)
        t.join()
        # 加入到context.threads，方便后面判断成功与否

    return context


def _delete_and_insert_es_fragments(file_uuid, doc_fragments: list[Fragment]):
    try:
        DocFragmentES().delete_by_file_uuid(file_uuid, wait_delete=True)
        _f_items = [DocFragmentModel(**item.model_dump(), file_uuid=file_uuid) for item in doc_fragments]
        insert_result = DocFragmentES().insert_doc_fragments(_f_items)
        logger.info(f"delete and insert es fragments succeed, file_uuid: {file_uuid}, fragment_count: {len(doc_fragments)}")
        return insert_result
    except Exception as e:
        logger.error(f"delete and insert es fragments error: {e}")
        return False


@register_span_func()
def embedding_and_upload(doc_fragments: list[Fragment], file_uuid: str):
    vector_params = [
        dict(
            file_uuid=file_uuid,
            uuid=doc_fragment.uuid,
            text=doc_fragment.ebed_text,
        )
        for doc_fragment in doc_fragments
    ]
    url = config["proxy"]["url"]
    batch_generator(vector_params, 320) | pl.thread.map(
        lambda x: requests.post(f"{url}/vector/upload", json=x), workers=12) | list

    return True
