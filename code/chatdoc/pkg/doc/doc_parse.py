'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-14 14:22:29
LastEditors: longsion
LastEditTime: 2024-10-16 14:19:16
'''


import os
from .objects import Context
from pkg.config import BASE_DIR, config
from pkg.storage import Storage
from pkg.utils import compress, decompress, retry_exponential_backoff
from pkg.utils.decorators import register_span_func
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.utils.logger import logger

import requests
import json


@register_span_func(func_name="文档解析", span_export_func=lambda context: context.model_dump(
    include=[
        "params",
        "trace_id",
        "org_file_path",
        "doc_parse_path"
    ]
))
def doc_parse(context: Context) -> Context:
    context.doc_parse_path = config["location"]["base_doc_parse_path"].format(BASE_DIR=BASE_DIR) % context.params.uuid

    if not context.params.force_doc_parse and local_or_remote_exist(context.doc_parse_path):
        with open(context.doc_parse_path, "r", encoding="utf-8") as f:
            context.doc_parse_result = json.load(f)
            context.file_meta.page_number = context.doc_parse_result['result']['src_page_count']

    else:
        # 调用doc-parse可能会失败或者超时
        context.doc_parse_result, context.page_base64_imgs = document_parse(context.org_file_path, config["parse"]["doc_parse_url"])
        doc_result_json = json.dumps(context.doc_parse_result, ensure_ascii=False)
        context.file_meta.page_number = context.doc_parse_result['result']['src_page_count']
        logger.info(f'doc parser, page_num: {context.file_meta.page_number}')
        thread = ThreadWithReturnValue(target=upload_doc_parser, args=(doc_result_json, context.doc_parse_path,))
        thread.start()
        context.threads.append(thread)

        # 上传png图片【开启线程上传】
        multi_upload_png(context)

    return context


def local_or_remote_exist(doc_parse_path):
    if os.path.exists(doc_parse_path):
        return True

    compress_path = doc_parse_path.replace(".json", ".gz")

    filename = os.path.basename(compress_path)
    compress_data, err = Storage.download_without_warning(filename, compress_path)
    if err:
        return False

    file_content = decompress(compress_data)
    with open(doc_parse_path, 'w', encoding="utf-8") as f:
        f.write(file_content)

    return True


def document_parse(filePath, url):
    """
    调用doc-parse的解析函数
    :param pdf_file_path: 需要解析的文件路径地址
    :return: 解析的json结果
    """
    ocr_url = f'{url}&page_range=0'
    with open(filePath, 'rb') as infile:
        data = infile.read()
    res = requests.post(ocr_url, data=data)
    res.raise_for_status()
    res_json_all = res.json()
    first_page = res_json_all['result']['pages'][0]
    res_json_all['result']['pages'] = []
    src_count_num = res_json_all['result']['src_page_count']
    name_dict = filePath.split("/")
    file_base64 = []
    post_list = []
    for i in range(1, src_count_num, 10):
        start = i
        end = min(i + 9, src_count_num - 1)
        new_ocr_url = f'{url}&page_range={start}-{end}'
        post_list.append({
            "url": new_ocr_url
        })
    request_ret_without_first_page = multi_parse(post_list, data)
    request_ret_without_first_page.insert(0, [first_page])

    for pages in request_ret_without_first_page:
        for page in pages:
            filename = name_dict[-1] + "_" + str(page["num"]) + ".png"
            if page.get("image"):
                file_base64.append({
                    "filename": filename,
                    "base64": page["image"]["base64"]
                })
                page["image"]["url"] = config["storage"]["download_address"] + filename
                del page["image"]["base64"]
            else:
                page["image"] = {
                    "url": config["storage"]["download_address"] + name_dict[-1]
                }
        res_json_all['result']['pages'].extend(pages)

    return res_json_all, file_base64


def multi_parse(post_list, data):

    @retry_exponential_backoff()
    def _request_parse(urls, data):
        result = []
        for url in urls:
            res = requests.post(url, data=data)
            res.raise_for_status()
            res_json = res.json()
            result.append(res_json['result']['pages'])
        return result

    size = int(config["parse"]["parse_concurrency"])
    batch_size = len(post_list) // size + 1
    groups = [post_list[i:i + batch_size] for i in range(0, len(post_list), batch_size)]

    threads, ret = [], []
    for group in groups:
        urls = [item["url"] for item in group]
        thread = ThreadWithReturnValue(target=_request_parse, args=(urls, data, ))
        thread.start()
        threads.append(thread)

    for thread in threads:
        ret.extend(thread.join())

    return ret


def upload_doc_parser(doc_result: str, docpath: str, url=None):
    compress_data = compress(doc_result)
    doc_parser_name = docpath.split("/")[-1]
    doc_parser_compress_name = doc_parser_name.replace(".json", ".gz")
    _, err = Storage.upload(doc_parser_compress_name, compress_data, url=url)

    return err


def multi_upload_png(context: Context):

    def _upload(group):
        for i in range(len(group)):
            _, err = Storage.upload(group[i]["filename"], group[i]["base64"])

        return err

    size = config["parse"]["upload_file_concurrency"]
    batch_size = len(context.page_base64_imgs) // size + 1
    groups = [context.page_base64_imgs[i:i + batch_size] for i in range(0, len(context.page_base64_imgs), batch_size)]
    for group in groups:
        thread = ThreadWithReturnValue(target=_upload, args=(group, ))
        thread.start()
        context.threads.append(thread)

    del context.page_base64_imgs
