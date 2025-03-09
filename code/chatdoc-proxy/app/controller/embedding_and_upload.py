'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-14 17:58:13
LastEditors: longsion
LastEditTime: 2025-03-05 18:29:29
'''

from app.config import config
from app.objects.vector import TextWithoutVecEntity, PersonalTextWithoutVecEntity, VdbTypeEnum
from app.utils.logger import log_msg
from app.utils.utils import batch_generator
from app.services.embedding import acge_embedding_multi_by_entities, acge_embedding_multi_by_personal_entities

import pypeln as pl

EMBEDDING_BATCH_SIZE = int(config["embedding"]["batch_size"])
EMBEDDING_PARALLELS = int(config["embedding"]["parallels"])

ZILLIZ_BATCH_SIZE = int(config["zilliz"]['batch_size'])
ZILLIZ_PARALLELS = int(config["zilliz"]['parallels'])


@log_msg
def embedding_and_upload(doc_texts: list[TextWithoutVecEntity]):

    if config["vector"]["model"] == VdbTypeEnum.zilliz.value:
        from app.services.zilliz import insert_entities
    elif config["vector"]["model"] == VdbTypeEnum.tencent.value:
        from app.services.tencent import insert_entities
    else:
        from app.services.es_embeddings import insert_entities

    batch_generator(
        (
            batch_generator(doc_texts, EMBEDDING_BATCH_SIZE)
            | pl.thread.map(
                acge_embedding_multi_by_entities,
                workers=EMBEDDING_PARALLELS,
                maxsize=EMBEDDING_PARALLELS,
            )
            | pl.sync.flat_map(lambda x: x)
        ),
        ZILLIZ_BATCH_SIZE
    ) | pl.thread.map(insert_entities, workers=ZILLIZ_PARALLELS, maxsize=ZILLIZ_PARALLELS) | list

    # TODO: exception return False
    return True


@log_msg
def embedding_and_upload_personal(doc_texts: list[PersonalTextWithoutVecEntity]):

    if config["vector"]["model"] == VdbTypeEnum.zilliz.value:
        from app.services.zilliz import insert_personal_entities
    elif config["vector"]["model"] == VdbTypeEnum.tencent.value:
        from app.services.tencent import insert_personal_entities
    else:
        from app.services.es_embeddings import insert_personal_entities

    batch_generator(
        (
            batch_generator(doc_texts, EMBEDDING_BATCH_SIZE)
            | pl.thread.map(
                acge_embedding_multi_by_personal_entities,
                workers=EMBEDDING_PARALLELS,
                maxsize=EMBEDDING_PARALLELS,
            )
            | pl.sync.flat_map(lambda x: x)
        ),
        ZILLIZ_BATCH_SIZE
    ) | pl.thread.map(insert_personal_entities, workers=ZILLIZ_PARALLELS, maxsize=ZILLIZ_PARALLELS) | list

    # TODO: exception return False
    return True
