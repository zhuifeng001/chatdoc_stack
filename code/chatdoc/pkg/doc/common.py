'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-06-05 10:24:27
LastEditors: longsion
LastEditTime: 2024-10-16 14:18:17
'''

from pkg.utils import retry_exponential_backoff
from pkg.doc.objects import FileMeta, Params
from pkg.utils.decorators import register_span_func
from pkg.utils.logger import logger

import requests

callback_file_meta_keys = ['uuid', 'page_number', 'first_image_id', 'knowledge_id', 'ori_type']


@retry_exponential_backoff(base_delay=0.2)
@register_span_func()
def callback(callback_url, file_uuid, status, file_meta: FileMeta = None, params: Params = None):
    if not callback_url:
        logger.error(f"未提供callback_url, 不进行回调, file_uuid: {file_uuid}, status: {status}")
        return

    # 返回请求的参数信息
    if file_meta and params:
        file_meta.knowledge_id = params.knowledge_id
        file_meta.ori_type = params.ori_type

    callback_params = dict(uuid=file_uuid,
                           status=status,
                           file_meta=file_meta.model_dump(include=callback_file_meta_keys) if file_meta else None)
    logger.info(f"callback_url: {callback_url}, params: {callback_params}")
    resp = requests.post(callback_url, json=callback_params)
    resp.raise_for_status()
