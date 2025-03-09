'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-17 10:57:45
LastEditors: longsion
LastEditTime: 2024-05-28 19:05:30
'''
from enum import Enum
from .acge_embedding import acge_embedding, acge_embedding_with_cache, acge_embedding_multi, acg_embedding_multi_batch_with_cache
from .peg_embedding import peg_embedding, peg_embedding_with_cache, peg_embedding_multi, peg_embedding_multi_batch_with_cache


class EmbeddingType(Enum):
    acge = "acge"
    peg = "peg"


def embedding_text_by_type(text, type: EmbeddingType = EmbeddingType.acge, dimension: int = 1024, use_cache: bool = True):
    if type == EmbeddingType.acge:
        return acge_embedding_with_cache(text, dimension=dimension) if use_cache else acge_embedding(text)
    elif type == EmbeddingType.peg:
        return peg_embedding_with_cache(text) if use_cache else peg_embedding(text)
    else:
        raise ValueError(f"{type} is not a valid embedding type")
