'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-15 15:12:21
LastEditors: longsion
LastEditTime: 2025-03-07 14:53:58
'''
import json
from pydantic import BaseModel
import requests
from requests.auth import HTTPBasicAuth
import time
from app.utils.logger import log_msg, logger
from app.config import config


class EsBaseItem(BaseModel):
    created_at: str = ""


class ESCompanyObject(EsBaseItem):
    eid: str = None
    uuid: str = None
    name: str = None
    alias: list[str] = []


class ESFileObject(EsBaseItem):
    uuid: str
    ori_type: str
    filename: str

    upload_time: str
    kownledge_id: str

    file_type: str
    year: list[str]
    company: str  # uuid | eid
    extract_company_str: str = ""
    file_title: str = ""

    page_number: int = 0
    # 保存第一页image_id，目前node层用
    first_image_id : str = ""

    keywords: list[str]
    summary: str
    doc_fragments_json: str = ""
    tree_summaries: list[str] = []

    def get_file_desc_md(self, company_mapper: dict):
        """
        获取文件描述
        company_mapper: dict[str, ESCompanyObject]
        """
        descs = []
        if self.filename:
            descs.append(("文件名称", self.filename))
        if self.file_type and self.file_type != "通用文档":
            descs.append(("文件类型", self.file_type))
        if self.company and self.company in company_mapper:
            descs.append(("公司", company_mapper[self.company].name))
        elif self.extract_company_str:
            descs.append(("公司", self.extract_company_str))

        if self.year:
            descs.append(("年份", f"{self.year}"))

        return "。".join([
            f"{k}: {v}" for k, v in descs
        ])


class ES:
    def __init__(self):
        hosts = config["es"]["hosts"].split("|")
        self.hosts = hosts
        self.default_host = hosts[0]
        self.username = config["es"].get("username")
        self.password = config["es"].get("password")

    def bulk_update_embeddings(self, index , items):
        """批量更新多个文档的向量字段

        Args:
            index: ES索引名称
            items: 列表，每项包含 uuid 和 embedding，格式如：
                  [{"uuid": "doc1_uuid", "embedding": [...]}, ...]
        """

        should_conditions = [{"term": {"uuid": item["uuid"]}} for item in items]

        search_body = {
            "query": {
                "bool": {
                    "should": should_conditions,
                    "minimum_should_match": 1
                }
            },
            "_source": ["uuid"],  # 只需要返回uuid字段
            "size": len(items)
        }

        # 获取文档列表
        docs = self.search_with_hits(index, search_body)

        # print("search result of uuids: ", should_conditions, docs)
        print("search result of uuids: ", should_conditions, "docs length: ", len(docs))

        # 构建uuid到_id的映射
        uuid_to_id = {doc["_source"]["uuid"]: doc["_id"] for doc in docs}

        # 构建bulk更新请求
        bulk_data = []
        for item in items:
            doc_id = uuid_to_id.get(item["uuid"])
            if not doc_id:
                logger.warning(f"未找到uuid对应的文档: {item['uuid']}")
                continue

            # 添加更新操作的元数据和数据
            bulk_data.append(json.dumps({
                "update": {
                    "_index": index,
                    "_id": doc_id
                }
            }))
            bulk_data.append(json.dumps({
                "doc": {
                    "acge_embedding": item["embedding"]
                }
            }))

        if not bulk_data:
            logger.error("没有找到任何可更新的文档")
            return False

        bulk_body = "\n".join(bulk_data) + "\n"
        try:
            url = f"{self.default_host}/_bulk"
            headers = {"Content-Type": "application/x-ndjson"}
            resp = requests.post(
                url=url,
                data=bulk_body,
                headers=headers,
                auth=HTTPBasicAuth(self.username, self.password) if self.username else None,
                verify=False
            )

            if resp.status_code != 200:
                logger.error(f"批量更新文档向量失败: {resp.text}")
                return False

            # 检查更新结果
            result = resp.json()
            if result.get("errors", False):
                failed_docs = [item["update"]["_id"] for item in result["items"] if item["update"]["status"] != 200]
                logger.error(f"部分文档更新失败: {failed_docs}")
                return False

            return True

        except Exception as e:
            logger.error(f"批量更新文档向量异常: {str(e)}")
            raise e

    @log_msg
    def search(self, index, search_body):
        try:
            st = time.time()
            for host in [self.default_host] + self.hosts:
                url = f"{host}/{index}/_search"
                if self.username:
                    resp = requests.get(url, json=search_body, auth=HTTPBasicAuth(self.username, self.password), verify=False)
                else:
                    resp = requests.get(url, json=search_body, verify=False)

                if resp.status_code == 200:
                    self.default_host = host
                    break

            et = time.time()
            if et - st > 0.5:
                logger.warning(f"ES search too slow: {et - st}s, index: {index}, search_body: {json.dumps(search_body, ensure_ascii=False)}")
            return resp.json()
        except Exception as e:
            logger.error(f"ES Error: search_body: {json.dumps(search_body, ensure_ascii=False)}")
            raise e

    def search_with_hits(self, index, search_body):
        try:
            st = time.time()
            for host in [self.default_host] + self.hosts:
                url = f"{host}/{index}/_search"
                if self.username:
                    resp = requests.get(url, json=search_body, auth=HTTPBasicAuth(self.username, self.password), verify=False)
                else:
                    resp = requests.get(url, json=search_body, verify=False)

                if resp.status_code == 200:
                    self.default_host = host
                    break

            et = time.time()
            if et - st > 0.5:
                logger.warning(f"ES search too slow: {et - st}s, index: {index}, search_body: {json.dumps(search_body, ensure_ascii=False)}")
            return resp.json()["hits"]["hits"]

        except Exception as e:
            logger.error(f"ES Error: search_body: {json.dumps(search_body, ensure_ascii=False)}")
            raise e


global_es = ES()
