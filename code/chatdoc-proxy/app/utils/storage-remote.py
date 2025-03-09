'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-03-29 17:29:49
LastEditors: longsion
LastEditTime: 2024-09-26 20:23:21
'''
import gzip
from io import BytesIO
import requests

from app.config import config
from app.utils.utils import save_file, retry_exponential_backoff


class Storage:
    @staticmethod
    @retry_exponential_backoff()
    def upload(filename, content):
        if type(content) is str:
            content = content.encode("utf-8")
        try:
            ret = requests.post(config["storage"]["upload_address"] + filename, data=content, timeout=60)
            ret.raise_for_status()
        except Exception as e:
            print("upload file failed:", e)
            return None, e
        return None, None

    @staticmethod
    @retry_exponential_backoff()
    def download(filename, download_path):
        try:
            ret = requests.get(config["storage"]["download_address"] + filename, timeout=60)
            ret.raise_for_status()
            print("Download file success:", filename)
        except Exception as e:
            print("Download file failed:", e)
            return None, e

        save_file(download_path, ret.content)

        return ret.content, None


def compress(data):
    json_bytes = data.encode('utf-8')
    buffer = BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb') as f:
        f.write(json_bytes)
    return buffer.getvalue()
