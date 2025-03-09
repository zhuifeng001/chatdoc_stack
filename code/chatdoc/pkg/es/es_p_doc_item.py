'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-15 14:08:26
LastEditors: longsion
LastEditTime: 2024-10-17 14:48:13
'''


import time
from pkg.config import config
from pkg.es import global_es, EsBaseItem
import requests
from pkg.utils import ensure_list
from pkg.utils.logger import logger


class PDocItemModel(EsBaseItem):
    user_id: str
    uuid: str = None        # 文件的uuid
    titles: list[str] = []
    ori_id: list[str] = []
    content: str = None
    type: str = None


class PDocItemES(object):

    @property
    def index_name(self):
        return config["es"]["index_p_doc_item"]

    @property
    def settings(self):
        return {
            "index": {
                "refresh_interval": "200ms",
                "number_of_shards": "12",
                "number_of_replicas": "1"
            }
        }

    @property
    def properties(self):
        return {
            "user_id": {
                "type": "keyword",
                "ignore_above": 100
            },
            "uuid": {
                "type": "keyword",
                "ignore_above": 100
            },
            "type": {
                "type": "keyword",
                "ignore_above": 100
            },
            "ori_id": {
                "type": "keyword",
                "ignore_above": 100
            },
            "titles": {
                "type": "text"
            },
            "content": {
                "type": "text"
            },
            "created_at": {
                "type": "date",  # 字段类型为日期
                "format": "yyyy-MM-dd HH:mm:ss"  # 日期格式示例，根据实际需求调整
            }
        }

    def create_index(self):
        global_es.create_index(self.index_name, dict(settings=self.settings, mappings=dict(properties=self.properties)))

    def search_by_ori_id(self, uuid: str, ori_id: list[str], size: int = 10) -> list[PDocItemModel]:
        hits = global_es.search(self.index_name, {
            "_source": ["uuid", "ori_id", "type", "titles", "content"],
            "size": size,
            "query": {
                "bool": {
                    "must": [
                        dict(term=dict(ori_id=ori_id)),
                        dict(term=dict(uuid=uuid)),
                    ]
                },
            }
        })
        return [
            PDocItemModel(
                uuid=hit["_source"]["uuid"],
                ori_id=ensure_list(hit["_source"]["ori_id"]),
                type=hit["_source"]["type"],
                titles=ensure_list(hit["_source"]["titles"]),
                content=hit["content"]["content"],
            ) for hit in hits
        ]

    def delete_index(self):
        url = config["es"]["hosts"] + "/" + self.index_name
        requests.delete(url)
        self.wait_delete_index_done()

    def wait_delete_index_done(self):
        import time

        retry_times = 50
        while retry_times > 0:
            flag = (
                not global_es.conn.indices.exists(self.index_name)
            )

            if flag:
                break

            retry_times -= 1
            time.sleep(1)

        if retry_times == 0:
            raise Exception("wait_delete_done timeout")

    def insert_doc_item(self, doc_item: PDocItemModel) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": doc_item.model_dump()
            }
        ])

    def insert_doc_items(self, doc_items: list[PDocItemModel]) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": doc_item.model_dump()
            } for doc_item in doc_items
        ])

    def delete_by_file_uuid(self, uuid, wait_delete=True):
        start_time = time.time()
        global_es.delete_document_by_query(index=self.index_name, query=dict(term=dict(uuid=uuid)), wait_delete=wait_delete)
        logger.info(f"PDocItemES delete_by_file_uuid: {uuid}, cost: {1000 * (time.time() - start_time): .1f}ms")

    def delete_by_user_and_file_uuids(self, user_id, uuids, wait_delete=True):
        start_time = time.time()
        query = {
            "bool": {
                "must": [
                    {"terms": {"uuid": uuids}},
                    {"term": {"user_id": user_id}}
                ]
            }
        }
        global_es.delete_document_by_query(index=self.index_name, query=query, wait_delete=wait_delete)
        logger.info(f"PDocItemES delete_by_user_and_file_uuid, user_id: {user_id}, uuids: {uuids}, cost: {1000*(time.time() - start_time):.1f}ms")

    def get_by_uuid_ori_tuples(self, pairs: list[tuple[str, str]], user_id, fillup=True) -> list[PDocItemModel]:
        pairs = list(set(pairs))
        uuid_groups = {}
        for uuid, ori_id in pairs:
            if uuid not in uuid_groups:
                uuid_groups[uuid] = []
            uuid_groups[uuid].append(ori_id)

        hits = []
        for uuid, ori_ids in uuid_groups.items():
            # 构建查询体
            search_body = {
                "_source": PDocItemModel.keys(),
                "query": {
                    "bool": {
                        "filter": [
                            {"terms": {"ori_id": ori_ids}},
                            {"term": {"uuid": uuid}},
                            {"term": {"user_id": user_id}}
                        ]
                    }
                },
                "size": int(len(ori_ids) * 1.2)
            }
            hits.extend(
                global_es.search(index=self.index_name, search_body=search_body)
            )

        doc_items = [PDocItemModel(**hit["_source"]) for hit in hits]
        uncached_pairs = set(pairs) - set([(doc_item.uuid, ori_id) for doc_item in doc_items for ori_id in doc_item.ori_id])
        if fillup and len(doc_items) >= len(pairs) and uncached_pairs:
            # 再重新补全一遍, 确保找到
            fillup_doc_items = self.get_by_uuid_ori_tuples(uncached_pairs, user_id, fillup=False)
            doc_items.extend(fillup_doc_items)

        doc_items = {f"{doc_item.uuid}|{doc_item.ori_id}": doc_item for doc_item in doc_items}.values()

        return doc_items
