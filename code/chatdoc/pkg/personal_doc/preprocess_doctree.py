'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-15 11:02:22
LastEditors: longsion
LastEditTime: 2024-09-20 16:22:09
'''


import re
import pypeln as pl
import requests

from pkg.storage import Storage
from .objects import Context, DocTreeNode, DocOriItem, DocOriItemType
from pkg.utils.decorators import register_span_func
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.utils.transform import html2markdown
from pkg.utils.generator import batch_generator_with_index
from pkg.utils import compress, plat_call, xjson
from pkg.es.es_p_doc_item import PDocItemES, PDocItemModel
from pkg.config import config


@register_span_func(func_name="目录树预处理", span_export_func=lambda context: dict(
    params=context.params.model_dump(),
    trace_id=context.trace_id,
    catalog_path=context.catalog_path,
    len_doc_ori_items=len(context.doc_ori_items),
))
def preprocess_doctree(context: Context) -> Context:
    """
    目录树预处理
    # 1. 生成ori_id对于原文的映射，存入到es中
    # 2. 方便切片逻辑的数据获取，以及存储
    """

    context.doc_ori_items, doc_tree_nodes = doctree_dfs(context.doc_tree.tree[0])

    table_items_nodes = [
        (doc_ori_item, doc_tree_node) for doc_ori_item, doc_tree_node in zip(context.doc_ori_items, doc_tree_nodes) if doc_ori_item.type == DocOriItemType.TABLE
    ]
    markdowns = plat_call([merge_table(doc_ori_item.content) for doc_ori_item, _ in table_items_nodes], html_list_2_markdown)
    for (doc_ori_item, doc_tree_node), content_markdown_list in zip(table_items_nodes, markdowns):
        doc_ori_item.content = "\n".join(content_markdown_list)
        doc_tree_node.content = [doc_ori_item.content]

    # 添加冗余字段
    upload_merge_thread = ThreadWithReturnValue(target=upload_merge_file, args=(context.doc_ori_items, context.params.user_id, context.params.uuid))
    upload_merge_thread.start()
    context.threads.append(upload_merge_thread)

    # upload to es
    thread = ThreadWithReturnValue(target=upload_ori_items_to_es, args=(context.doc_ori_items, context.params.user_id, context.params.uuid))
    thread.start()
    context.threads.append(thread)

    return context


@register_span_func()
def html_list_2_markdown(tables):
    '''
    description: 耗时超过，超过20个，则走proxy的并发处理
    return {*}
    '''
    if len(tables) < 20:
        return [html2markdown(table) for table in tables]
    else:
        url = config["proxy"]["url"]
        # url = "http://localhost:8000"
        batch_size = max(len(tables) // 10 + 1, 10)
        workers = min(len(tables) // batch_size + 1, 10)
        markdown_tables_2d = batch_generator_with_index(tables, batch_size) | pl.thread.map(
            lambda x: (x[0], requests.post(f"{url}/transform/html2markdown", json=x[1]).json()), workers=workers, maxsize=workers
        ) | list
        markdown_tables_2d.sort(key=lambda x: x[0], reverse=False)
        markdown_tables = [_markdown_table for _, _markdown_tables in markdown_tables_2d for _markdown_table in _markdown_tables]
        return markdown_tables


def doctree_dfs(doctree_node: DocTreeNode, titles=[]) -> list[DocOriItem]:
    _type = DocOriItemType.PARAGRAPH
    for _content in doctree_node.content:
        if _content.startswith("<table border="):
            _type = DocOriItemType.TABLE
            break

    if _type == DocOriItemType.TABLE:
        content = doctree_node.content  # content is list, 后续需要处理
    else:
        content = "\n".join(doctree_node.content)

    node_item = DocOriItem(
        titles=titles,
        ori_id=doctree_node.ori_id,
        content=content,
        content_html=content,
        type=_type,
    )
    r1, r2 = [node_item], [doctree_node]
    if doctree_node.children:
        if isinstance(content, list):
            content = content[0] if content else ""
        child_titles = titles + [re.sub(r'[第一二三四五六七八九十零壹贰叁肆伍陆柒捌玖拾章节、（）()0123456789. ]', '', content)]
        for child in doctree_node.children:
            _r1, _r2 = doctree_dfs(child, titles=child_titles)
            r1.extend(_r1)
            r2.extend(_r2)

    return r1, r2


def upload_ori_items_to_es(doc_ori_items: list[DocOriItem], user_id: str, file_uuid: str):

    PDocItemES().delete_by_user_and_file_uuids(user_id, [file_uuid], wait_delete=True)

    batch_size = 1000
    for i in range(0, len(doc_ori_items), batch_size):

        batch_items = [
            PDocItemModel(
                user_id=user_id,
                uuid=file_uuid,
                titles=doc_ori_item.titles,
                ori_id=doc_ori_item.ori_id,
                content=doc_ori_item.content,
                type=doc_ori_item.type.value,
            )
            for doc_ori_item in doc_ori_items[i:i + batch_size]
        ]

        PDocItemES().insert_doc_items(batch_items)


def upload_merge_file(doc_ori_items: list[DocOriItem], user_id: str, file_uuid: str):

    def gen_merge_map(doc_items: list[DocOriItem]) -> list[DocOriItem]:
        items_ret = []
        for item in doc_items:
            if not item.ori_id:
                continue
            # 是否跨页
            curr_ori_id = item.ori_id[0]
            first_page = curr_ori_id.split(",")[0]
            has_merge = False
            if len(item.ori_id) > 1:
                for ori_id in item.ori_id[1:]:
                    if not ori_id.startswith(first_page):
                        has_merge = True

            if has_merge:
                items_ret.append(item)
                continue

            # 表格
            if DocOriItemType.TABLE == item.type:
                items_ret.append(item)

        return items_ret

    def dfs_tree(node: DocTreeNode):
        result = {ori_id: node for ori_id in node.ori_id}
        for _node in node.children:
            result.update(dfs_tree(_node))

        return result

    new_items = gen_merge_map(doc_ori_items)
    new_items = [item.model_dump(include=['content', 'ori_id', 'type', 'content_html']) for item in new_items]

    ori_tables = [item for item in new_items if item["type"] == DocOriItemType.TABLE]
    for ori_table in ori_tables:
        table_htmls = merge_table(ori_table["content_html"])
        ori_table["html"] = table_htmls[0] if table_htmls else ""

    for item in new_items:
        if "html" not in item:
            item["html"] = ""
        item.pop("content_html")

    content = xjson.dumps(new_items)
    Storage.upload(f"User_{user_id}/merge-{file_uuid}.gz", compress(content))


def merge_table(infos):
    """
    合并表格，合并逻辑为连续的表格进行合并
    :param lst:
    :return:
    """

    def end_id(i, infos):
        while i < len(infos) - 1:
            if """<table border="1">""" in infos[i] and """<table border="1">""" in infos[i + 1]:
                i += 1
            else:
                break
        return i

    result = []
    i = 0
    while i < len(infos):
        if """<table border="1">""" in infos[i]:
            j = end_id(i, infos)
            result.append("""<table border="1">"""
                          + "".join([r.replace("""<table border="1">""", "").replace("""</table>""", "") for r in infos[i:j + 1]])
                          + """</table>""")
            i = j + 1
        else:
            result.append(infos[i])
            i += 1
    return result
