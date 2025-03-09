'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-15 19:54:42
LastEditors: longsion
LastEditTime: 2024-10-17 14:48:23
'''


import time
from pkg.config import config
from pkg.es import global_es, EsBaseItem
from pkg.utils.logger import logger
import requests

from pkg.es.es_p_retrieval import es_retrieve
from pkg.embedding.acge_embedding import get_similar_top_n


class PDocTableModel(EsBaseItem):
    user_id: str = ""               # 用户id
    uuid: str = None
    title: str = ""
    ori_id: list[str] = []
    type: str = None           # 表格类型： 三大表|...
    row_id: int = -1           # 行id  markdown2list 之后的行号
    keywords: list[str] = []   # 关键词列表【BM25搜索】 行B字段
    ebed_text: str = ""        # embedding字符串


class PDocTableES(object):

    @property
    def index_name(self):
        return config["es"]["index_p_doc_table"]

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
                "type": "keyword"
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
            "title": {
                "type": "text"
            },
            "keywords": {
                "type": "text"
            },
            "ebed_text": {
                "type": "text"
            },
            "row_id": {
                "type": "integer",
            },
            "created_at": {
                "type": "date",  # 字段类型为日期
                "format": "yyyy-MM-dd HH:mm:ss"  # 日期格式示例，根据实际需求调整
            }
        }

    def create_index(self):
        global_es.create_index(self.index_name, dict(settings=self.settings, mappings=dict(properties=self.properties)))

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

    def insert_doc_table(self, doc_table: PDocTableModel) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        return global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": doc_table.model_dump()
            }
        ])

    def insert_doc_tables(self, doc_tables: list[PDocTableModel]) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        return global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": doc_table.model_dump()
            } for doc_table in doc_tables
        ])

    def delete_by_file_uuid(self, uuid, wait_delete=True):
        start_time = time.time()
        global_es.delete_document_by_query(index=self.index_name, query=dict(term=dict(uuid=uuid)), wait_delete=wait_delete)
        logger.info(f"PDocTableES delete_by_file_uuid: {uuid}, cost: {1000*(time.time() - start_time):.1f}ms")

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
        logger.info(f"PDocTableES delete_by_user_and_file_uuid, user_id: {user_id}, uuids: {uuids}, cost: {1000*(time.time() - start_time):.1f}ms")

    def search_table(self, bm25_text, ebd_text, user_id, document_uuids, size=20) -> list[PDocTableModel]:

        op_fields = PDocTableModel.keys(exclude=["acge_embedding", "peg_embedding"])

        hits = es_retrieve(index=self.index_name,
                           text=bm25_text,
                           text_for_embedding=ebd_text,
                           text_field="keywords",
                           bm25_size=size,
                           op_fields=op_fields,
                           embedding_args=[
                               # EmbeddingArgs(type=EmbeddingType.acge, field="acge_embedding", size=size, dimension=512),
                               # EmbeddingArgs(type=EmbeddingType.peg, field="peg_embedding", size=size),
                           ],
                           must_conditions=[
                               dict(terms=dict(uuid=document_uuids)),
                               dict(term=dict(user_id=user_id))
                           ],
                           )

        hits = self.filter_by_embedding(hits, ebd_text, match_score=0.5)
        return [PDocTableModel.from_hit(hit) for hit in hits]

    def search_fixed_tables(self, titles, user_id, document_uuids, keyword) -> list[PDocTableModel]:
        '''
        description: 寻找三大表内容
        return {*}
        '''
        from pkg.doc.objects import DocTableType

        condition_should = [
            dict(
                match_phrase=dict(title=title)
            )
            for title in titles
        ]
        condition_must = [
            dict(match=dict(keywords=keyword)),
        ]
        condition_filter = [
            dict(terms=dict(uuid=document_uuids)),
            dict(term=dict(type=DocTableType.THREE_TABLE.value)),
            dict(term=dict(user_id=user_id)),
        ]
        op_fields = PDocTableModel.keys()
        search_body = {
            "_source": op_fields,
            "query": {
                "bool": {
                    "should": condition_should,
                    "must": condition_must,
                    "filter": condition_filter,
                    "minimum_should_match": 1,
                }
            },
        }
        hits = global_es.search(self.index_name, search_body)
        return [
            PDocTableModel(**hit["_source"]) for hit in hits
        ]

    def filter_by_embedding(self, hits, sentence, match_score):
        texts = ["".join(hit.get("keywords", [])) for hit in hits]
        embedding_matches = get_similar_top_n(texts=texts, sentence=sentence, top_n=len(texts))
        matches = [embedding_match for embedding_match in embedding_matches if embedding_match[1] >= match_score]
        return [hit for hit in hits if "".join(hit.get("keywords", [])) in list([match[0] for match in matches])]
