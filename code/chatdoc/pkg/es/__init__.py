'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-24 15:25:44
LastEditors: longsion
LastEditTime: 2025-03-07 16:15:11
'''
from pkg.config import config
from pkg.utils import ensure_list
from pkg.utils.logger import logger
from functools import cache

import time
import json
import requests
from datetime import datetime
from elasticsearch import ConflictError, TransportError, helpers
from elasticsearch import Elasticsearch
from pkg.utils.objects import IFBaseModel
from requests.auth import HTTPBasicAuth


@cache
def get_model_json_schema(cls):
    return cls.model_json_schema()


class EsBaseItem(IFBaseModel):

    created_at: str = ""

    @classmethod
    def keys(cls, exclude=[]):
        all_keys = list(get_model_json_schema(cls)["properties"].keys())
        return [key for key in all_keys if key not in exclude]

    @classmethod
    def from_hit(cls, hit: dict):
        for key, _property in get_model_json_schema(cls)["properties"].items():
            if key in hit and _property["type"] == "array":
                hit[key] = ensure_list(hit[key])

        return cls(**hit)


class ES:
    def __init__(self):
        hosts = config["es"]["hosts"].split("|")
        self.hosts = hosts
        self.default_host = hosts[0]
        self.username = config["es"].get("username")
        self.password = config["es"].get("password")
        if config["es"].get("username"):
            # deprecated
            # self.conn = Elasticsearch(hosts, http_auth=(config["es"]["username"], config["es"]["password"]))
            self.conn = Elasticsearch(
                hosts,
                basic_auth=(config["es"]["username"], config["es"]["password"]),
                verify_certs=False,     # 验证证书
                # ca_certs="/path/to/ca.crt"  # CA证书的路径，如果自签名的话需要这个
            )

        else:
            self.conn = Elasticsearch(hosts)

    @staticmethod
    def analyze(text):
        json_text = {
            "text": text,
            "analyzer": "ik_max_word"
        }
        address = config["es"]["hosts"].split("|")[0]
        ret = requests.get(url=address + '/_analyze', json=json_text)
        ret.raise_for_status()
        return ret.json()

    @staticmethod
    def read_json(path):
        with open(path, "r", encoding='utf-8') as f:
            data = f.read()
        return json.loads(data)

    def create_index(self, index, setting):
        logger.info(f"begin create index: {index}")
        ret = self.conn.indices.create(index=index, body=setting)
        if "error" in ret:
            raise Exception(ret["error"])
        logger.info(f"create index: {index} successfully")

    def get_extact_unique_field(self, index, uuid_field, uuid_value):
        search_body = {
            "term": {
                uuid_field: uuid_value
            }
        }
        search_result = self.conn.search(index=index, query=search_body, size=1)
        existing_docs = search_result['hits']['hits']
        return existing_docs[0] if existing_docs else None

    def check_exists(self, index, uuid):
        search_body = {
            "match": {
                "uuid": uuid
            }
        }
        ret = self.conn.search(index=index, query=search_body, size=1)
        return ret["hits"]["total"]["value"] > 0

    def insert(self, index, docs, max_retries=3, retry_delay=1) -> bool:
        # 判断文档是否已存在
        if len(docs) == 0:
            logger.warning(f"document empty ignore es insert, index: {index}")
            return True

        # 使用helpers.bulk方法插入，为每个操作指定op_type为'create'
        # 确保了如果尝试插入的文档ID已经在索引中存在，则该操作会被忽略
        for doc in docs:
            doc["_op_type"] = "create"
            doc["_source"]["created_at"] = datetime.strftime(datetime.now(), "%Y-%m-%d %H:%M:%S")

        for attempt in range(max_retries + 1):  # 加1是因为range不包含结束值
            try:
                result = helpers.bulk(self.conn, docs)
                if result[0] == len(docs):
                    # logger.info(f"All documents processed successfully docs size: {len(docs)}")
                    return True
                elif attempt < max_retries:  # 如果还有重试机会且没全部成功
                    logger.info(f"Not all documents were processed correctly, retrying in {retry_delay} seconds... ({attempt+1}/{max_retries})")
                    time.sleep(retry_delay)  # 等待一段时间后重试
                else:
                    logger.info("Exhausted all retries. Not all documents could be inserted.")
            except TransportError as e:
                if attempt < max_retries:
                    logger.info(f"A transport error occurred: {e}. Retrying in {retry_delay} seconds... ({attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"Failed after {max_retries} retries due to transport error: {e}")
                    return False
            except ConflictError as e:
                if attempt < max_retries:
                    logger.info(f"Conflict error occurred. Retrying in {retry_delay} seconds... ({attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"Failed after {max_retries} retries due to conflict error: {e}")
                    return False
            except Exception as e:
                logger.error(f"An unexpected error occurred: {e}")
                return False

        return False  # 如果所有尝试都失败了

    def delete_document(self, index, doc_id):
        """
        Delete a document from the specified index.
        :param index: The name of the index.
        :param doc_id: The unique identifier for the document.
        """
        self.conn.delete(index=index, id=doc_id)

    def delete_document_by_query(self, index, query: dict, wait_delete=True, wait_sec: int = 30, max_retries=5, retry_delay=1):
        """
        query = {"term": {"file_uuid": uuid}}
        """

        for attempt in range(max_retries + 1):  # 加1是因为range不包含结束值
            try:
                self.conn.delete_by_query(index=index, query=query)
            except ConflictError as e:
                if attempt < max_retries:
                    logger.warning(f"Delete_by_query Conflict error occurred. Retrying in {retry_delay} seconds... ({attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"Delete_by_query Failed after {max_retries} retries due to conflict error")
                    raise e

        if wait_delete:
            self.wait_delete_done(index, query, wait_sec)

    def wait_delete_done(self, index, query: dict, wait_sec: int = 30, sleep_gap=0.5):
        st = time.time()
        while time.time() < st + wait_sec:
            count = self.get_query_count(index, query)
            if count == 0:
                logger.info(f"Wait_delete_done succ: time cost is {1000*(time.time() - st):.1f}ms")
                return True
            time.sleep(sleep_gap)

        raise Exception(f"Wait_delete_done timeout: {query}")

    def get_query_count(self, index, query):
        resp = self.conn.count(index=index, query=query)
        # logger.info(resp)
        return resp["count"]

    def upsert_document(self, index, doc_id, doc, update_fields=None):
        """
        Upsert a document into the specified index. If the document already exists, it will be updated.
        If it doesn't exist, it will be inserted.

        :param index: The name of the index.
        :param doc_id: The unique identifier for the document.
        :param doc: The document content to be upserted.
        :param update_fields: A dictionary specifying fields to update if the document exists.
                           If None, the entire 'doc' will be used for update.
        """
        if update_fields is None:
            update_fields = doc

        update_script = {
            "script": {
                "source": "if (ctx._source != null) { for (def entry : params.updateFields.entrySet()) { ctx._source[entry.key] = entry.value; } } else { ctx._source = params.updateFields; }",
                "lang": "painless",
                "params": {
                    "updateFields": update_fields
                }
            },
            "upsert": doc
        }

        try:
            response = self.conn.update(index=index, id=doc_id, body=update_script)
            if response['result'] in ('updated', 'created'):
                logger.info(f"Document with ID {doc_id} upserted successfully.")
            else:
                logger.warning(f"Upsert operation failed for document with ID {doc_id}. Response: {response}")
        except Exception as e:
            logger.error(f"Error during upsert operation: {e}")
            raise

    def search(self, index, search_body):
        try:
            st = time.time()
            body_str = json.dumps(search_body, ensure_ascii=False)
            for host in [self.default_host] + self.hosts:
                url = f"{host}/{index}/_search"
                if self.username:
                    resp = requests.get(url, json=search_body, auth=HTTPBasicAuth(self.username, self.password), verify=False)
                else:
                    resp = requests.get(url, json=search_body, verify=False)

                if resp.status_code == 200:
                    resp = resp.json()
                    self.default_host = host
                    break
                else:
                    print(f"search error, search_body: {search_body},resp: {resp.text}")

            hits = resp["hits"]["hits"]
            et = time.time()

            logger.info(f"searching ES: {index}, duration: {(et-st) * 1000:.1f}ms")

            if et - st > 0.5:
                logger.warning(f"ES search too slow: {1000*(et - st):.1f}ms, index: {index}, search_body: {body_str}")
            # return [hit["_source"][field] for hit in hits]
            return hits
        except Exception as e:
            logger.error(f"ES Error: search_body: {search_body}", )
            raise e

    def search_local(self, index, search_body):
        try:
            st = time.time()
            proxy_url = config["proxy"]["url"]
            resp = requests.post(f"{proxy_url}/es_proxy/search", json=dict(
                index=index,
                search_body=search_body
            ))
            hits = resp.json()["hits"]["hits"]
            et = time.time()

            logger.info(f"searching ES: {index}, duration: {(et-st) * 1000:.1f}ms")

            if et - st > 0.5:
                logger.warning(f"ES search too slow: {1000*(et - st):.1f}ms, index: {index}, search_body: {json.dumps(search_body, ensure_ascii=False)}")
            # return [hit["_source"][field] for hit in hits]
            return hits
        except Exception as e:
            logger.error("ES Error: search_body: {search_body}")
            raise e


def generate_es_mapping(model_class):
    # model_class: pydantic class
    properties = {}
    for field_name, field_type in model_class.__fields__.items():
        field_info = field_type.field_info
        es_field = {}

        if isinstance(field_type.outer_type_, type) and issubclass(field_type.outer_type_, str):
            es_field["type"] = "text" if field_name != "ebed_text" else "keyword"
        elif isinstance(field_type.outer_type_, type) and issubclass(field_type.outer_type_, int):
            es_field["type"] = "integer"
        elif isinstance(field_type.outer_type_, type) and issubclass(field_type.outer_type_, bool):
            es_field["type"] = "boolean"
        elif field_type.outer_type_ == list[str]:
            es_field["type"] = "keyword"
        elif field_type.outer_type_ == list[float]:
            es_field["type"] = "dense_vector"
            es_field["dims"] = field_info.dims if hasattr(field_info, "dims") else 0  # 假设你可能在Field中设置了dims属性
            es_field["index"] = True
            es_field["similarity"] = "cosine"

        if field_info.default is not None:
            es_field["default"] = field_info.default

        properties[field_name] = es_field

    return {
        "mappings": {
            "properties": properties
        }
    }


es_index_default_settings = {
    "refresh_interval": "200ms",
    "number_of_shards": "3",
    "number_of_replicas": "1"
}

global_es = ES()
