'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-15 14:32:13
LastEditors: longsion
LastEditTime: 2024-10-18 15:01:18
'''


import time
from .objects import Context, DocOriItem, DocOriItemType, DocTableRowItem, DocTableType
from pkg.utils.decorators import register_span_func
from pkg.utils.transform import markdown2list, list2markdown, is_financial_string, financial_string_to_number
from pkg.structure_static import three_table_set
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.utils.logger import logger

import re


@register_span_func(func_name="表格切片&数据上报", span_export_func=lambda context: dict(
    params=context.params.model_dump(),
    trace_id=context.trace_id,
    doc_table_row_items=[cur.model_dump() for cur in context.doc_table_row_items],
    len_doc_table_row_items=len(context.doc_table_row_items),
))
def cut_table_fragment(context: Context) -> Context:
    """
    表格切片数据上报
    row_texts: 表格转换为文本逻辑 行X列Y是__
    """

    all_tables = [doc_ori_item for doc_ori_item in context.doc_ori_items if doc_ori_item.type == DocOriItemType.TABLE]

    for table in all_tables:
        table_title = table.titles[-1] if table.titles else ""
        table_title = re.sub(r'[第一二三四五六七八九十零壹贰叁肆伍陆柒捌玖拾章节、（）()0123456789. ]', '', table_title)
        # 三大表
        if table_title in three_table_set:
            row_items = extract_row_data_from_three_table(table)
        # 普通表
        else:
            row_items = extract_row_data_from_normal_table(table)

        context.doc_table_row_items.extend(row_items)

    # multi_embedding and upload to es
    thread = ThreadWithReturnValue(target=embedding_and_upload, args=(context.doc_table_row_items, context.params.uuid))
    thread.start()
    context.threads.append(thread)

    return context


def embedding_and_upload(doc_table_row_items: list[DocTableRowItem], file_uuid: str):
    from pkg.es.es_doc_table import DocTableES, DocTableModel

    start_time = time.time()

    # 删除老切片
    DocTableES().delete_by_file_uuid(file_uuid, wait_delete=True)

    if not doc_table_row_items:
        logger.warning(f"File cut has 0 table, file_uuid: {file_uuid}")
        return True

    success = DocTableES().insert_doc_tables([
        DocTableModel(
            uuid=file_uuid,
            title=item.title,
            ori_id=item.ori_id,
            type=item.type.value,
            row_id=item.row_id,
            keywords=item.keywords,
            ebed_text=item.row_ebed_str,
        )
        for item in doc_table_row_items
    ])

    if not success:
        logger.error(f"Table Update Es Not Success, file_uuid: {file_uuid}, exception: {e}")
    else:
        logger.info(f"Table Update Es All Successed, file_uuid: {file_uuid},  docs: {len(doc_table_row_items)}, Elapsed: {1000*(time.time() - start_time):.1f}ms")

    return success


def extract_row_data_from_three_table(table: DocOriItem) -> list[DocTableRowItem]:
    """
    将表格拆解为行数据，用于表格召回逻辑使用
    """
    row_data_list = []

    table_list = markdown2list(table.content)

    title_row = []

    table_title = table.titles[-1] if table.titles else ""

    for row_idx, row_data in enumerate(table_list):
        if not row_data:
            # 跳过空行
            continue

        if not title_row:
            # 第一行非空行为标题
            title_row = row_data
            continue

        if len(row_data) != len(title_row):
            # 长度不相同可能是分页后附注没有值，会变成3行，补齐4行
            if '附注' in title_row and len(title_row) == len(row_data) + 1:
                fuzhu_index = title_row.index('附注')
                row_data = row_data[:fuzhu_index] + [''] + title_row[fuzhu_index:]

            else:
                # 如果长度不等于标题，则忽略这行
                continue

        row_texts = []

        # 默认：title列为第1列
        row_title = row_data[0]

        for col_idx, cell_data in enumerate(row_data):
            col_title = title_row[col_idx]
            if not col_title:
                continue

            if is_financial_string(cell_data):
                cell_number = financial_string_to_number(cell_data)
                row_texts.append(f"{col_title}的{row_title}是{cell_number}元")

            else:
                row_texts.append(f"{col_title}的{row_title}为空")

        def _clean_text(text):
            text = text.replace("加：", "").replace("减：", "").replace("其中：", "").replace(" ", "").replace("12月31日", "")
            text = re.sub(r'[\(（]?[一二三四五六七八九零十\d]+[、)）]', '', text)
            text = re.sub(r'（(损失|亏损|净亏损).*填列）', '', text)
            return text

        row_data_list.append(
            DocTableRowItem(
                title=table_title,
                ori_id=table.ori_id,
                type=DocTableType.THREE_TABLE,
                row_id=row_idx,
                keywords=list(filter(lambda x: x,
                                     [_clean_text(keyword) for keyword in list(filter(lambda x: not is_financial_string(x), row_data))]
                                     )),
                row_ebed_str=f"## {table_title} \n" + "\n".join([_clean_text(row_text) for row_text in row_texts])
            )
        )

    return row_data_list


def extract_row_data_from_normal_table(table: DocOriItem) -> list[DocTableRowItem]:
    """
    从普通表格中抽取并上报
    """
    row_data_list = []

    table_list = markdown2list(table.content)

    title_row = []

    table_title = table.titles[-1] if table.titles else ""

    for row_idx, row_data in enumerate(table_list):
        if not row_data:
            # 跳过空行
            continue

        if not title_row:
            # 第一行非空行为标题
            title_row = row_data
            continue

        title_len, row_len = len(title_row), len(row_data)

        # row_data = [x if not is_financial_string(x) else "" for x in row_data]
        per_row_table = []
        # 补齐长度
        if row_len < title_len:
            per_row_table = [
                title_row,
                row_data + [""] * (title_len - row_len)
            ]

        elif row_len > title_len:
            per_row_table = [
                title_row + [""] * (row_len - title_len),
                row_data
            ]

        else:
            per_row_table = [
                title_row,
                row_data
            ]

        row_data_list.append(
            DocTableRowItem(
                title=table_title,
                ori_id=table.ori_id,
                type=DocTableType.NORMAL_TABLE,
                row_id=row_idx,
                keywords=list(filter(lambda x: x, row_data)),
                row_ebed_str=f"## {table_title} \n" + list2markdown(per_row_table)
            )
        )

    return row_data_list
