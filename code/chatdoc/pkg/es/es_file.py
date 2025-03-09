'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-11 18:08:16
LastEditors: longsion
LastEditTime: 2024-10-16 10:58:50
'''


import time
from pkg.config import config
from pkg.es import global_es, EsBaseItem, es_index_default_settings
from pkg.utils.logger import logger
import requests


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


class FileES(object):

    @ property
    def index_name(self):
        return config["es"]["index_file"]

    @ property
    def settings(self):
        return {
            "index": es_index_default_settings
        }

    @ property
    def properties(self):
        return {
            "uuid": {
                "type": "keyword",
                "ignore_above": 100
            },
            # 年份
            "year": {
                "type": "keyword",
                "ignore_above": 100
            },
            # 公司【Company表的eid|uuid】
            "company": {
                "type": "keyword",
                "ignore_above": 100
            },
            # 抽取到的公司名【个人知识库】
            "extract_company_str": {
                "type": "text"
            },
            # 文件名
            "filename": {
                "type": "text"
            },
            # 文件标题
            "file_title": {
                "type": "text"
            },
            # 来源类型
            "ori_type": {
                "type": "keyword",
                "ignore_above": 100
            },
            # 上传时间
            "upload_time": {
                "type": "keyword",
                "ignore_above": 100
            },
            # 知识库id
            "kownledge_id": {
                "type": "keyword",
                "ignore_above": 100
            },
            # 文件类型
            "file_type": {
                "type": "keyword",
                "ignore_above": 100
            },
            "keywords": {
                "type": "text"
            },
            "summary": {
                "type": "text"
            },
            "tree_summaries": {
                "type": "text"
            },
            "summary_embedding": {
                "type": "dense_vector",
                "dims": 1024
            },
            "created_at": {
                "type": "date",  # 字段类型为日期
                "format": "yyyy-MM-dd HH:mm:ss"  # 日期格式示例，根据实际需求调整
            },
            "doc_fragments_json": {  # doc_tree json字段，存储uuid及ori_id等数据
                "type": "text",
                "index": False,
            },
            # 第一页的图片id
            "first_image_id": {
                "type": "keyword",
                "ignore_above": 100
            },
            # 总页数
            "page_number": {
                "type": "integer",
            },
        }

    def create_index(self):
        global_es.create_index(self.index_name, dict(settings=self.settings, mappings=dict(properties=self.properties)))

    def delete_index(self):
        url = config["es"]["hosts"] + "/" + self.index_name
        requests.delete(url)

    def insert_file(self, file: ESFileObject):
        """
        插入数据
        :param data:
        :return:
        """
        return global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": file.model_dump()
            }
        ])

    def update_file(self, file_uuid, **kwargs):
        exist_doc = global_es.get_extact_unique_field(self.index_name, "uuid", file_uuid)
        if exist_doc:
            global_es.upsert_document(self.index_name, exist_doc["_id"], kwargs)

    def insert_files(self, files: list[ESFileObject]):
        """
        插入数据
        :param data:
        :return:
        """
        global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": file.model_dump()
            } for file in files
        ])

    def search_by_company(self, company_eid: str = None, company_uuid: str = None, size: int = 10) -> list[ESFileObject]:
        """
        根据公司eid/company_uuid搜索文件
        :param company_eid:
        :return:
        """
        assert company_eid or company_uuid, "company_eid or company_uuid is required"
        hits = global_es.search(self.index_name, {
            "_source": ESFileObject.keys(exclude=["acge_embedding", "peg_embedding"]),
            "size": size,
            "query": {
                "bool": {
                    "filter": [dict(term=dict(company=company_eid or company_uuid))],
                }
            }
        })
        return [
            ESFileObject.from_hit(hit["_source"])
            for hit in hits
        ]

    def delete_by_file_uuid(self, uuid, wait_delete=True):
        start_time = time.time()
        global_es.delete_document_by_query(index=self.index_name, query=dict(term=dict(uuid=uuid)), wait_delete=wait_delete)
        logger.info(f"FileES delete_by_file_uuid: {uuid}, cost: {1000*(time.time() - start_time):.1f}ms")

    def delete_by_file_uuids(self, uuids, wait_delete=True):
        start_time = time.time()
        global_es.delete_document_by_query(index=self.index_name, query=dict(terms=dict(uuid=uuids)), wait_delete=wait_delete)
        logger.info(f"FileES delete_by_file_uuids: {uuids}, cost: {1000*(time.time() - start_time):.1f}ms")

    def get_by_file_uuids(self, uuids, with_doc_fragments_json=True):
        hits = global_es.search(self.index_name, {
            "_source": ESFileObject.keys(exclude=["acge_embedding", "peg_embedding"]) if with_doc_fragments_json else ESFileObject.keys(exclude=["acge_embedding", "peg_embedding", "doc_fragments_json"]),
            "size": len(uuids),
            "query": dict(terms=dict(uuid=uuids)),
        })
        return [
            ESFileObject.from_hit(hit["_source"])
            for hit in hits if hit["_source"]["ori_type"] == "系统知识库"
        ]

    def search_file_fragment_json(self, uuid: str):
        hits = global_es.search(self.index_name, {
            "_source": ["doc_fragments_json"],
            "size": 1,
            "query": {
                "bool": {
                    "filter": [dict(term=dict(uuid=uuid))],
                }
            }
        })

        return hits[0]["_source"]["doc_fragments_json"] if hits else None

    def search_file_brief_by_query(self, query):
        condition_should = [
            {
                "match": {"filename": query}
            }
        ]
        hits = global_es.search(self.index_name, {
            "_source": ESFileObject.keys(exclude="doc_fragments_json"),
            "size": 100,
            "query": {
                "bool": {
                    "must": [
                        {"term": {"ori_type": "系统知识库"}}
                    ],
                    "should": condition_should,
                }
            },
        })
        return [
            ESFileObject.from_hit(hit["_source"])
            for hit in hits
        ]


if __name__ == "__main__":
    objects = FileES().search_by_company(company_eid="6d042872-a626-4174-aae9-f418e8e2af87")
    print(objects)
