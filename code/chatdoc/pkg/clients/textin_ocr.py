'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-10-12 10:13:59
LastEditors: longsion
LastEditTime: 2025-03-09 08:13:19
'''
import requests
from pkg.config import config


class TextinOcr(object):
    def __init__(self, app_id: str = None, app_secret: str = None):
        self._app_id = app_id or config["textin"]["app_id"]
        self._app_secret = app_secret or config["textin"]["app_secret"]
        self.url = config["pdf2md"]["url"]

    @property
    def options(self):
        return {
            # 'pdf_pwd': None,
            'dpi': config["pdf2md"]["options_dpi"] or 72,
            'page_start': int(config["pdf2md"]["options_page_start"]) or 0,
            'page_count': int(config["pdf2md"]["options_page_count"]) or 2000,
            'apply_document_tree': int(config["pdf2md"]["options_apply_document_tree"]) or 1,
            'markdown_details': int(config["pdf2md"]["options_markdown_details"]) or 1,
            'page_details': int(config["pdf2md"]["options_page_details"]) or 1,
            'char_details': int(config["pdf2md"]["options_char_details"]) or 1,
            'table_flavor': config["pdf2md"]["options_table_flavor"] or 'html',
            'get_image': config["pdf2md"]["options_get_image"] or 'page',
            'parse_mode': config["pdf2md"]["options_parse_mode"] or 'auto',
        }

    def recognize_pdf2md(self, image):
        """
        pdf to markdown
        :param options: request params
        :param image: file bytes
        :return: response

        options = {
            'pdf_pwd': None,
            'dpi': 72,
            'page_start': 0,
            'page_count': 24,
            'apply_document_tree': 0,
            'markdown_details': 1,
            'page_details': 1,
            'table_flavor': 'md',
            'get_image': 'none',
            'parse_mode': 'auto',
        }

        """

        headers = {
            'x-ti-app-id': self._app_id,
            'x-ti-secret-code': self._app_secret
        }

        return requests.post(self.url, data=image, headers=headers, params=self.options)
