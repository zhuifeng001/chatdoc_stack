'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-08-06 14:42:29
LastEditors: longsion
LastEditTime: 2024-10-16 14:33:45
'''
import requests

from pkg.config import config
from pkg.utils import save_file, retry_exponential_backoff
from pkg.utils.logger import logger


class Storage:
    @staticmethod
    @retry_exponential_backoff()
    def upload(filename, content, url=None):
        if type(content) is str:
            content = content.encode("utf-8")
        try:
            ret = requests.post((url or config["storage"]["upload_address"]) + filename, data=content, timeout=60)
            ret.raise_for_status()
        except Exception as e:
            logger.error(f"upload file failed: {e}")
            return None, e
        return None, None

    @staticmethod
    @retry_exponential_backoff()
    def download(filename, download_path, url=None):
        try:
            ret = requests.get((url or config["storage"]["download_address"]) + filename, timeout=60)
            ret.raise_for_status()
            logger.info(f"Download file success: {filename}")
        except Exception as e:
            logger.error(f"Download file failed: {e}")
            return None, e

        save_file(download_path, ret.content)

        return ret.content, None

    def download_content(filename, url=None):
        try:
            ret = requests.get((url or config["storage"]["download_address"]) + filename, timeout=60)
            ret.raise_for_status()
            logger.info(f"Download file success: {filename}")
        except Exception as e:
            logger.error(f"Download file failed: {e}")
            return None, e

        return ret.content, None

    @staticmethod
    @retry_exponential_backoff()
    def download_without_warning(filename, download_path, url=None):
        try:
            ret = requests.get((url or config["storage"]["download_address"]) + filename, timeout=60)
            ret.raise_for_status()
        except Exception as e:
            return None, e

        save_file(download_path, ret.content)

        return ret.content, None
