'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-14 11:49:51
LastEditors: longsion
LastEditTime: 2024-05-21 20:28:20
'''

import os
from .objects import Context, FileProcessException
from pkg.storage import Storage
from pkg.config import BASE_DIR, config
from pkg.utils.decorators import register_span_func


@register_span_func()
def download_file(context: Context) -> Context:

    filedir = config["location"]["base_file_path"].format(BASE_DIR=BASE_DIR)
    filepath = filedir + context.params.uuid

    context.org_file_path = filepath

    if os.path.exists(filepath):
        return context

    _, download_exception = Storage.download(context.params.uuid, filepath)

    if download_exception:
        raise FileProcessException(message=f"download file error: {download_exception}")

    return context
