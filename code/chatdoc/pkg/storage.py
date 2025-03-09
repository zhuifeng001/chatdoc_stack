'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-08-06 14:42:29
LastEditors: longsion
LastEditTime: 2025-03-07 15:36:14
'''
import os

from pkg.config import config
from pkg.utils import save_file, retry_exponential_backoff
from pkg.utils.logger import logger
from pkg.config import BASE_DIR, config


class Storage:
    @staticmethod
    @retry_exponential_backoff()
    def upload(filename, content, url=None):
        # save 到本地
        filedir = config["location"]["base_file_path"].format(BASE_DIR=BASE_DIR)
        save_file(os.path.join(filedir, filename), content)
        return None, None

    @staticmethod
    @retry_exponential_backoff()
    def download(filename, download_path, url=None):
        filedir = config["location"]["base_file_path"].format(BASE_DIR=BASE_DIR)
        filepath = os.path.join(filedir, filename)

        with open(filepath, "rb") as f:
            return f.read(), None

    def download_content(filename, url=None):
        try:
            filedir = config["location"]["base_file_path"].format(BASE_DIR=BASE_DIR)
            filepath = os.path.join(filedir, filename)

            with open(filepath, "rb") as f:
                return f.read(), None
        except Exception as e:
            logger.error(f"Download file failed: {e}")
            return None, e

    @staticmethod
    @retry_exponential_backoff()
    def download_without_warning(filename, download_path, url=None):
        filedir = config["location"]["base_file_path"].format(BASE_DIR=BASE_DIR)
        filepath = os.path.join(filedir, filename)

        with open(filepath, "rb") as f:
            return f.read(), None
