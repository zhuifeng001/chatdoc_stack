'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-16 19:53:22
LastEditors: longsion
LastEditTime: 2025-03-06 22:14:29
'''


import time
from pkg.config import config
from pkg.embedding import EmbeddingType
from pkg.es import global_es, EsBaseItem
from pkg.utils.logger import logger
import requests


class DocFragmentModel(EsBaseItem):
    uuid: str = ""                  # 切片唯一标识uuid
    file_uuid: str = ""             # 文件uuid
    ori_id: list[str] = []          # 定位用id
    type: str = "text"              # 切片类型 text/table/title
    ebed_text: str = ""             # 用于emebedding的text

    parent_frament_uuid: str = ""   # 父级片段uuid
    children_fragment_uuids: list[str] = []  # 子级片段uuid

    tree_token_length: int = 0      # 节点及子节点token长度
    token_length: int = 0           # 当前节点token长度
    level: int = 1                  # 切片所在文档树level，从1开始

    # ---- leaf切片属性 ----
    leaf: bool = False              # 是否是叶子节点
    leaf_split_idx: int = 1         # leaf 节点切分的节点index，从1开始
    leaf_split_num: int = 1         # leaf 节点切分的节点总数
    leaf_start_offset: int = 0      # 起始偏移【相对ori_id中的偏移】
    leaf_end_offset: int = 0        # 结束偏移

    table_title_row_idx: int = 0    # 表格标题行
    table_start_row_idx: int = 0    # 表格起始行
    table_end_row_idx: int = 0      # 表格结束行


class DocFragmentES(object):

    @property
    def index_name(self):
        return config["es"]["index_doc_fragment"]

    @property
    def settings(self):
        return {
            "index": {
                "refresh_interval": "200ms",
                "number_of_shards": "18",
                "number_of_replicas": "1"
            }

        }

    @property
    def properties(self):
        return {
            "uuid": {
                "type": "keyword"
            },
            "file_uuid": {
                "type": "keyword"
            },
            "ori_id": {
                "type": "keyword"
            },
            "type": {
                "type": "keyword"
            },
            "ebed_text": {
                "type": "text",
                "analyzer": "standard"
            },
            "parent_frament_uuid": {
                "type": "keyword"
            },
            "children_fragment_uuids": {
                "type": "keyword"
            },
            "tree_token_length": {
                "type": "integer"
            },
            "token_length": {
                "type": "integer"
            },
            "level": {
                "type": "integer"
            },
            "leaf": {
                "type": "boolean"
            },
            "leaf_split_idx": {
                "type": "integer"
            },
            "leaf_split_num": {
                "type": "integer"
            },
            "leaf_start_offset": {
                "type": "integer"
            },
            "leaf_end_offset": {
                "type": "integer"
            },
            "table_title_row_idx": {
                "type": "integer"
            },
            "table_start_row_idx": {
                "type": "integer"
            },
            "table_end_row_idx": {
                "type": "integer"
            },
            "created_at": {
                "type": "date",  # 字段类型为日期
                "format": "yyyy-MM-dd HH:mm:ss"  # 日期格式示例，根据实际需求调整
            },
            "acge_embedding": {
                "type": "dense_vector",
                "dims": 1024,
            }
        }

    def create_index(self):
        global_es.create_index(self.index_name, dict(settings=self.settings, mappings=dict(properties=self.properties)))

    def delete_index(self):
        url = config["es"]["hosts"] + "/" + self.index_name
        requests.delete(url)
        self.wait_delete_index_done()

    @property
    def keys(self):
        return DocFragmentModel.keys(exclude=["acge_embedding", "peg_embedding"])

    @property
    def keys_without_embedding(self):
        return DocFragmentModel.keys(exclude=["acge_embedding", "peg_embedding"])

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

    def insert_doc_fragment(self, doc_fragment: DocFragmentModel) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        return global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": doc_fragment.model_dump()
            }
        ])

    def insert_doc_fragments(self, doc_fragments: list[DocFragmentModel]) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        return global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": doc_fragment.model_dump()
            } for doc_fragment in doc_fragments
        ])

    def delete_by_file_uuid(self, file_uuid, wait_delete=True):
        start_time = time.time()
        global_es.delete_document_by_query(index=self.index_name, query=dict(term=dict(file_uuid=file_uuid)), wait_delete=wait_delete)
        logger.info(f"DocFragmentES delete_by_file_uuid: {file_uuid}, cost: {1000*(time.time() - start_time):.1f}ms")

    def delete_by_file_uuids(self, file_uuids, wait_delete=True):
        start_time = time.time()
        global_es.delete_document_by_query(index=self.index_name, query=dict(terms=dict(file_uuid=file_uuids)), wait_delete=wait_delete)
        logger.info(f"DocFragmentES delete_by_file_uuids: {file_uuids}, cost: {1000*(time.time() - start_time):.1f}ms")

    def get_by_uuids(self, uuids, fillup=True) -> list[DocFragmentModel]:
        uuids = list(set(uuids))
        hits = global_es.search(index=self.index_name, search_body=dict(
            _source=self.keys_without_embedding,
            query={
                "bool": {
                    "filter": [
                        dict(terms=dict(uuid=uuids))
                    ]
                }
            },
            size=int(len(uuids) * 1.2),
        ))

        doc_fragments = [DocFragmentModel(**hit["_source"]) for hit in hits]
        uncached_uuids = set(uuids) - set([doc_fragment.uuid for doc_fragment in doc_fragments])
        if fillup and len(doc_fragments) >= len(uuids) and uncached_uuids:
            # 再重新补全一遍, 确保找到
            fillup_doc_fragments = self.get_by_uuids(uncached_uuids, fillup=False)
            doc_fragments.extend(fillup_doc_fragments)

        # 根据uuid去重
        doc_fragments = {doc_fragment.uuid: doc_fragment for doc_fragment in doc_fragments}.values()

        return doc_fragments

    def search_fragment(self, bm25_text, ebd_text, document_uuids, size=10) -> list[DocFragmentModel]:
        from pkg.es.es_retrieval import EmbeddingArgs, es_retrieve

        hits = es_retrieve(index=self.index_name,
                           text=bm25_text,
                           text_for_embedding=ebd_text,
                           text_field="ebed_text",
                           bm25_size=size,
                           op_fields=self.keys_without_embedding,
                           embedding_args=[
                               EmbeddingArgs(type=EmbeddingType.acge, field="acge_embedding", size=size, dimension=1024),
                               #    EmbeddingArgs(type=EmbeddingType.peg, field="peg_embedding", size=size),
                           ],
                           must_conditions=[
                               dict(terms=dict(file_uuid=document_uuids))
                           ] if document_uuids else [],
                           )

        return [DocFragmentModel.from_hit(hit) for hit in hits]
