'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-14 14:50:42
LastEditors: longsion
LastEditTime: 2024-09-19 19:03:10
'''


import json
import os
from .objects import Context, FileProcessException, DocTree
from pkg.config import BASE_DIR, config
from pkg.storage import Storage
from pkg.utils import compress, decompress
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.utils.decorators import register_span_func
from pkg.personal_doc.doc_parse_process import json2lines
import requests


@register_span_func(func_name="目录树解析", span_export_func=lambda context: context.model_dump(
    include=[
        "params",
        "trace_id",
        "doc_parse_path",
        "catalog_path",
        "catalog_path_frontend",
    ]
))
def catalog(context: Context) -> Context:

    context.catalog_path = config["location"]["base_catalog_path"].format(BASE_DIR=BASE_DIR) % context.params.uuid
    context.catalog_path_frontend = config["location"]["base_frontend_catalog_path"].format(BASE_DIR=BASE_DIR) % context.params.uuid

    if not context.params.force_doc_parse and local_or_remote_exist(context.catalog_path):
        with open(context.catalog_path, "r", encoding="utf-8") as f:
            context.doc_tree = DocTree.model_validate(json.load(f))

    else:
        response = requests.post(config["parse"]["catalog_url"], json=dict(pages=context.doc_parse_result['result']['pages']))
        if response.status_code != 200:
            raise FileProcessException(f"catalog parse error: {response.text}")

        response_json = response.json()
        if response_json["code"] != 200:
            raise FileProcessException(f"catalog parse error: {response.text}")
        if len(context.doc_parse_result['result']['pages']) < 4:
            catalog_res = response_json["result"]
            response_json["result"] = tree_update(catalog_res)
        context.doc_tree = DocTree.model_validate(response_json["result"])

        threads = [
            ThreadWithReturnValue(target=upload_catalog, args=(context.params.user_id, context.doc_tree.model_dump_json(exclude=["tree"]), context.catalog_path_frontend,)),
            ThreadWithReturnValue(target=upload_catalog, args=(context.params.user_id, context.doc_tree.model_dump_json(), context.catalog_path,))
        ]
        [thread.start() for thread in threads]
        context.threads.extend(threads)

    del context.doc_parse_result

    return context


def local_or_remote_exist(catalog_path):
    if os.path.exists(catalog_path):
        return True

    compress_path = catalog_path.replace(".json", ".gz")

    filename = os.path.basename(compress_path)
    compress_data, err = Storage.download_without_warning(filename, compress_path)
    if err:
        return False

    file_content = decompress(compress_data)
    with open(catalog_path, 'w', encoding="utf-8") as f:
        f.write(file_content)

    return True


def upload_catalog(user_id: str, content: str, catalog_path: str, url=None):
    compress_data = compress(content)
    filename = catalog_path.split("/")[-1]
    doc_parser_compress_name = f"User_{user_id}/" + filename.replace(".json", ".gz")
    _, err = Storage.upload(doc_parser_compress_name, compress_data, url=url)

    return err


def tree_update(pages):
    """
    将目录树输出的格式重新处理，主要针对少页文本的情况，单页内容为一个heading下的内容

    """
    # 构造基础目录树
    tree = {
        "guid": "0",
        "label": "Root",
        "pos": [
            0,
            0,
            1,
            0,
            1,
            1,
            0,
            1
        ],
        "ori_id": [],
        "line_height": 1,
        "content": [
            "ROOT"
        ],
        "children": []
    }

    # doc-parser转换成catalog
    for i, page in enumerate(pages):
        #首三行作为标题节点
        sub_node = {}
        _, trans_result = json2lines(page, with_pos=False, p_index=i)
        # 找出当前页第一个表格出现的位置
        table_index = -1
        for index, block in enumerate(trans_result):
            if '<table border' in block["content"]:
                table_index = index
                break
        if table_index == 0:
            titles = [{'content': '', 'ori_id': '-1,0', 'pos': [0, 0, 0, 0, 0, 0, 0, 0], 'type': 'textblock'}]
            nodes = trans_result
        elif table_index == -1 or table_index >= 3:
            titles = trans_result[0:3]
            nodes = trans_result[3:]
        else:
            titles = trans_result[0:table_index]
            nodes = trans_result[table_index:]

        sub_node["children"] = []
        sub_node["content"] = [",".join([r["content"] for r in titles])]
        sub_node["label"] = "Heading"
        sub_node["ori_id"] = [r["ori_id"] for r in titles]
        sub_node["pos"] = titles[0]['pos']
        sub_node["pos_list"] = [r["pos"] for r in titles]
        tree["children"].append(sub_node)
        child_node = {
            "children": [],
            "content": [],
            "label": "Text",
            "ori_id": [],
            "pos": [],
            "pos_list": []
        }
        # 除首行外其余作为该标题下的内容,其中表格单独处理为一个节点
        for node in nodes:
            if '<table border>' in node["content"]:
                # 存储之前节点的信息，处理当前表格节点的信息
                if child_node != {}:
                    # todo 需要更改pos的坐标， pos坐标为pos_list里面所有坐标的最大外接矩
                    sub_node["children"].append(child_node)
                    child_node = {
                        "children": [],
                        "content": [],
                        "label": "Text",
                        "ori_id": [],
                        "pos": [],
                        "pos_list": []
                    }

                child_node["children"] = []
                child_node["content"].append(node["content"])
                child_node["label"] = "Table"
                child_node["ori_id"] = node["ori_id"]
                child_node["pos"] = node["pos"]
                child_node["pos_list"].append(node["pos"])
                sub_node["children"].append(child_node)
            else:
                child_node["children"] = []
                child_node["content"].append(node["content"])
                child_node["ori_id"].append(node["ori_id"])
                child_node["pos"] = node["pos"]
                child_node["pos_list"].append(node["pos"])
        if child_node["content"] != []:
            # todo 需要更改pos的坐标， pos坐标为pos_list里面所有坐标的最大外接矩
            sub_node["children"].append(child_node)

    return {
        "generate": [],
        "tree": [tree]
    }
