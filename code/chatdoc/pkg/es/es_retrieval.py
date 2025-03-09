'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-17 09:59:37
LastEditors: longsion
LastEditTime: 2025-03-08 23:50:57
'''

from pkg.embedding import embedding_text_by_type, EmbeddingType
from pkg.utils.logger import logger
from pkg.utils.decorators import register_span_func
from pkg.utils.rrf import RRF
from pkg.es import global_es
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pydantic import BaseModel
from pkg.vdb import get_vector_db_model


class EmbeddingArgs(BaseModel):
    type: EmbeddingType
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
    from pkg.vdb.tencent import search_analyst

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
            logger.warning(f"Not Exactly .... {item['uuid']} | {uuid}")
    return result


def retrieval_embeddings_by_zilliz(index, embedding_field_name, question_embedding: list[float], size: int, op_fields: list = [], must_conditions: list = []):
    """
    使用zilliz向量去召回，然后从es中加载详情数据
    """
    from pkg.vdb.zilliz import search_analyst

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
        for hit in global_es.search(index, query)
    ]

    result.sort(key=lambda x: uuids.index(x["uuid"]))
    for item in result:
        item["score"] = 1 + uuid_distance.get(item["uuid"], 0.0)

    for item, uuid in zip(result, uuids):
        if item["uuid"] != uuid:
            logger.warning(f"Not Exactly .... {item['uuid']} | {uuid}")

    result = [r for r in result if r["score"] >= 1.6]
    return result


@register_span_func()
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
        for hit in global_es.search(index, search_body=search_body)
    ]


def get_retrieval_embeddings_handler():
    current_vector_model = get_vector_db_model()
    vector_model_map = dict(
        es=retrieval_embeddings_by_es,
        zilliz=retrieval_embeddings_by_zilliz,
        tencent=retrieval_embeddings_by_tencent
    )
    func = vector_model_map.get(current_vector_model, retrieval_embeddings_by_es)
    return register_span_func()(func)


def es_retrieve(index, text, text_field, bm25_size=10, text_for_embedding="", op_fields=[], embedding_args: list[EmbeddingArgs] = [], must_conditions: list = []):
    """
    ES 召回方式
    如果传入embedding_args表明需要附加上 embedding的得分，使用rrf进行排名
    """

    # Embedding Recall
    hits = []
    op_fields = list(set(op_fields) | {"_id"})

    _retrieve_threads = []
    for embedding_arg in embedding_args:
        question_embedding = embedding_text_by_type(text_for_embedding or text, embedding_arg.type, dimension=embedding_arg.dimension, use_cache=True)

        _t = ThreadWithReturnValue(target=get_retrieval_embeddings_handler(), args=(index, embedding_arg.field, question_embedding, embedding_arg.size, op_fields, must_conditions,))
        _t.start()
        _retrieve_threads.append(_t)

    # BM25 Recall
    _hits = retrieve_bm25(index, text, text_field, size=bm25_size, op_fields=op_fields, must_conditions=must_conditions)
    hits.extend(
        [dict(**_hit, retrieval_type="bm25") for _hit in _hits if _hit["ebed_text"] != "ROOT" and "......." not in _hit['ebed_text']]
    )

    for _t, embedding_arg in zip(_retrieve_threads, embedding_args):
        _hits = _t.join()
        hits.extend(
            [dict(**_hit, retrieval_type=embedding_arg.type.value) for _hit in _hits if _hit["ebed_text"] != "ROOT" and "......." not in _hit['ebed_text']]
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
                          EmbeddingArgs(type=EmbeddingType.acge, field="embedding"),
                          EmbeddingArgs(type=EmbeddingType.peg, field="embedding_peg"),
                    ],
                    )
    )
