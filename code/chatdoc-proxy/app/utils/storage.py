'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-03-29 17:29:49
LastEditors: longsion
LastEditTime: 2025-03-05 19:41:01
'''
import gzip
from io import BytesIO
import os

from app.config import config, BASE_DIR
from app.utils.utils import save_file, retry_exponential_backoff


class Storage:
    @staticmethod
    @retry_exponential_backoff()
    def upload(filename, content, url=None):
        # save 到本地
        filedir = config["location"]["base_file_path"].format(BASE_DIR=BASE_DIR)
        save_file(os.path.join(filedir, filename), content)

    @staticmethod
    @retry_exponential_backoff()
    def download(filename, download_path, url=None):
        filedir = config["location"]["base_file_path"].format(BASE_DIR=BASE_DIR)
        filepath = os.path.join(filedir, filename)

        with open(filepath, "rb") as f:
            return f.read(), None


def compress(data):
    json_bytes = data.encode('utf-8')
    buffer = BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb') as f:
        f.write(json_bytes)
    return buffer.getvalue()
