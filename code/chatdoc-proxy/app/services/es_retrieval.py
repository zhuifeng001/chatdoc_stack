'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-16 18:24:16
LastEditors: longsion
LastEditTime: 2025-03-08 23:55:16
'''


from app.objects.vector import VdbTypeEnum
from app.utils.rrf import RRF
from app.utils.thread_with_return_value import ThreadWithReturnValue
from pydantic import BaseModel
from app.services.es import global_es
from app.services.embedding import embedding_with_cache
from app.utils.logger import logger
from app.config import config


class EmbeddingArgs(BaseModel):
    field: str
    size: int = 10
    dimension: int = 1024


def retrieval_embeddings_by_es(index, embedding_field_name, question_embedding: list[float], size: int, op_fields: list = [], must_conditions: list = []):
    """
    稠密检索，如向量匹配.
    Args:
        question_embedding: 查询问题的索引
        size: 返回的top-k的个数
        embedding_name: 查询问题匹配的ES数据库的表名的索引
    Returns:
    """
    source_string = f"""
                    if (!doc.containsKey('{embedding_field_name}') || doc['{embedding_field_name}'].empty) {{
                        return 0; 
                    }}
                    double dp = dotProduct(params.queryVector, '{embedding_field_name}');
                    if (dp < 0) {{
                        return 0;
                    }}
                    return dp;
                    """

    must_conditions.append(
        {
            "script_score": {
                "query": {
                    "match_all": {}
                },
                "script": {
                    "source": source_string,
                    "params": {
                        "queryVector": question_embedding
                    }
                }
            }

        }
    )
    query = {
        "_source": op_fields,
        "size": size,
        "query": {
            "bool": {
                "must": must_conditions,
                "filter": [
                ]
            },
        }
    }

    return [
        {
            "score": hit["_score"],
            "_id": hit["_id"],
            **hit["_source"]
        }
        for hit in global_es.search(index, query)
    ]


def retrieval_embeddings_by_tencent(index, embedding_field_name, question_embedding: list[float], size: int, op_fields: list = [], must_conditions: list = []):
    """
    使用腾讯VDB向量去召回，然后从es中加载详情数据
    """
    from app.services.tencent import search_analyst

    # tmp 使用
    document_uuids = []

    for condition in must_conditions:
        if "terms" in condition and "file_uuid" in condition["terms"]:
            document_uuids = condition["terms"]["file_uuid"]
            break

        elif "terms" in condition and "uuid" in condition["terms"]:
            document_uuids = condition["terms"]["uuid"]
            break

    search_resp = search_analyst(size=size, file_uuids=document_uuids, question_embedding=question_embedding)

    uuids = [hit["id"] for hit in search_resp[0]] if search_resp else []
    uuid_distance = {
        hit["id"]: hit["score"] for hit in search_resp[0]
    } if search_resp else {}

    if len(document_uuids) == 1:
        filters = [
            dict(term=dict(file_uuid=document_uuids[0])),
            dict(terms=dict(uuid=uuids))
        ]

        query = {
            "_source": op_fields,
            "size": len(uuids),
            "query": {
                "bool": {
                    "filter": filters
                },
            }
        }

    else:
        filters = [
            dict(terms=dict(uuid=uuids))
        ]
        should_conditions = [
            dict(term=dict(file_uuid=document_uuid)) for document_uuid in document_uuids
        ]
        query = {
            "_source": op_fields,
            "size": len(uuids),
            "query": {
                "bool": {
                    "should": should_conditions,
                    "filter": filters
                },
            }
        }

    result = [
        {
            "score": hit["_score"],
            "_id": hit["_id"],
            **hit["_source"]
        }
        for hit in global_es.search(index, query)
    ]

    result.sort(key=lambda x: uuids.index(x["uuid"]))
    for item in result:
        item["score"] = 1 + uuid_distance.get(item["uuid"], 0.0)

    for item, uuid in zip(result, uuids):
        if item["uuid"] != uuid:
            logger.info(f"Not Exactly .... {item['uuid']} | {uuid}")
    return result


def retrieval_embeddings_by_zilliz(index, embedding_field_name, question_embedding: list[float], size: int, op_fields: list = [], must_conditions: list = []):
    """
    使用zilliz向量去召回，然后从es中加载详情数据
    """
    from app.services.zilliz import search_analyst

    # tmp 使用
    document_uuids = []

    for condition in must_conditions:
        if "terms" in condition and "file_uuid" in condition["terms"]:
            document_uuids = condition["terms"]["file_uuid"]
            break

        elif "terms" in condition and "uuid" in condition["terms"]:
            document_uuids = condition["terms"]["uuid"]
            break

    search_resp = search_analyst(size=size, file_uuids=document_uuids, question_embedding=question_embedding)

    uuids = [hit["entity"]["uuid"] for hit in search_resp[0]] if search_resp else []
    uuid_distance = {
        hit["entity"]["uuid"]: hit["distance"] for hit in search_resp[0]
    } if search_resp else {}

    if len(document_uuids) == 1:
        filters = [
            dict(term=dict(file_uuid=document_uuids[0])),
            dict(terms=dict(uuid=uuids))
        ]

        query = {
            "_source": op_fields,
            "size": len(uuids),
            "query": {
                "bool": {
                    "filter": filters
                },
            }
        }

    else:
        filters = [
            dict(terms=dict(uuid=uuids))
        ]
        should_conditions = [
            dict(term=dict(file_uuid=document_uuid)) for document_uuid in document_uuids
        ]
        query = {
            "_source": op_fields,
            "size": len(uuids),
            "query": {
                "bool": {
                    "should": should_conditions,
                    "filter": filters
                },
            }
        }

    result = [
        {
            "score": hit["_score"],
            "_id": hit["_id"],
            **hit["_source"]
        }
        for hit in global_es.search_with_hits(index, query)
    ]

    result.sort(key=lambda x: uuids.index(x["uuid"]))
    for item in result:
        item["score"] = 1 + uuid_distance.get(item["uuid"], 0.0)

    for item, uuid in zip(result, uuids):
        if item["uuid"] != uuid:
            logger.info(f"Not Exactly .... {item['uuid']} | {uuid}")
    return result


def retrieve_bm25(index, text, text_field, size: int, op_fields: list = [], must_conditions: list = []):
    """
    稀疏检索,如bm25算法等.
    Args:
        size: 检索返回的个数
    Returns:
    """
    search_body = {
        "_source": op_fields,
        "size": size,
        "query": {
            "bool": {
                "should": [
                    {
                        "match": {text_field: text},
                    }
                ],
                "must": must_conditions,
                "must_not": [
                    {
                        "match": {
                            "title": "母公司"
                        }
                    }
                ],
            }
        }
    }

    return [
        {
            "score": hit["_score"],
            "_id": hit["_id"],
            **hit["_source"]
        }
        for hit in global_es.search_with_hits(index, search_body=search_body)
    ]


def es_retrieve(index, text, text_field, bm25_size=10, text_for_embedding="", op_fields=[], embedding_args: list[EmbeddingArgs] = [], must_conditions: list = []):
    """
    ES 召回方式
    如果传入embedding_args表明需要附加上 embedding的得分，使用rrf进行排名
    """

    # Embedding Recall
    hits = []
    op_fields = list(set(op_fields) | {"_id"})

    _retrieve_threads = []

    if config["vector"]["model"] == VdbTypeEnum.es.value:
        retrieval_embeddings_func = retrieval_embeddings_by_es
    elif config["vector"]["model"] == VdbTypeEnum.zilliz.value:
        retrieval_embeddings_func = retrieval_embeddings_by_zilliz
    elif config["vector"]["model"] == VdbTypeEnum.tencent.value:
        retrieval_embeddings_func = retrieval_embeddings_by_tencent

    for embedding_arg in embedding_args:
        question_embedding = embedding_with_cache([text_for_embedding or text])[0]
        _t = ThreadWithReturnValue(target=retrieval_embeddings_func, args=(index, embedding_arg.field, question_embedding, embedding_arg.size, op_fields, must_conditions,))
        _t.start()
        _retrieve_threads.append(_t)

    # BM25 Recall
    _hits = retrieve_bm25(index, text, text_field, size=bm25_size, op_fields=op_fields, must_conditions=must_conditions)
    hits.extend(
        [dict(**_hit, retrieval_type="bm25") for _hit in _hits]
    )

    for _t, embedding_arg in zip(_retrieve_threads, embedding_args):
        _hits = _t.join()
        hits.extend(
            [dict(**_hit, retrieval_type="acge") for _hit in _hits]
        )

    # k = 1 for test
    rerank_list = RRF().reciprocal_rank_fusion(hits, group_key="retrieval_type", k=1)

    results = [
        {
            "rrf_score": hit["score"],
            "id": hit["id"],
            **max(hit["results"], key=lambda x: x["score"]),
            "score": {cur['retrieval_type']: cur['score'] for cur in hit["results"]},
        }
        for hit in rerank_list
    ]

    return results


if __name__ == "__main__":
    print(
        es_retrieve(index="v2_qa_flagment_sub_vector",
                    text="东方财富2023年的净利润是多少",
                    text_field="texts",
                    bm25_size=10,
                    op_fields=["texts"],
                    embedding_args=[
                          EmbeddingArgs(field="embedding"),
                    ],
                    )
    )
