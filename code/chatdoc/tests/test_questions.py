'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-22 18:20:36
LastEditors: longsion
LastEditTime: 2024-04-22 19:21:39
'''


import json
from pkg.infer import process, Params
from concurrent.futures import ThreadPoolExecutor
import pandas as pd


def extract_data_from_excel(file_path, filter_ids=None):
    # 读取 Excel 文件
    df = pd.read_excel(file_path)

    # 如果提供了 filter_ids，只保留这些 id 的数据
    if filter_ids is not None:
        df = df[df['id'].isin(filter_ids)]

    # 初始化一个空列表来存储结果
    request_bodies = []

    # 遍历 DataFrame 的每一行
    for index, row in df.iterrows():
        # 创建一个字典，包含所需的字段和格式
        request_body = {
            "id": row["id"],
            "question": row["question"],
            "company": row["company"],
            "document_uuids": [row["uuid"]],
            "compliance_check": False,
            "document_companies": []
        }

        # 将这个字典添加到列表中
        request_bodies.append(request_body)

    return request_bodies


def run_with_question_ids(file_path, filter_ids):

    result = dict()
    for request_body in extract_data_from_excel(file_path, filter_ids):
        # 创建一个字典，用于存储请求参数
        params = Params(**request_body)
        futures = []
        with ThreadPoolExecutor(max_workers=5) as pool:
            futures.append(pool.submit(process, params))

        for future in futures:
            context = future.result()
            result[request_body["id"]] = [retrieve_context.get_text_str() for retrieve_context in context.rerank_retrieve_after_qa]

        with open("./tmp.json", "w") as fw:
            fw.write(json.dumps(result, ensure_ascii=False, indent=4))


# 使用函数
file_path = '/Users/xianglong_chen/Downloads/RAG_24356_2024-04-2208_54_08.xlsx'
# filter_ids = [27, 41, 20, 157, 269, 3, 51, 136, 156, 279, 38, 91, 127, 224, 69, 93, 116, 42, 333, 368, 398, 374, 386, 353, 389, 347, 396, 384, 380, 233, 138, 286, 301]
filter_ids = [27, 41, 20, 157, 269, 3]

run_with_question_ids(file_path, filter_ids)
