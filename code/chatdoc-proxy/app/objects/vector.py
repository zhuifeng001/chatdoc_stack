'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-14 17:54:10
LastEditors: longsion
LastEditTime: 2025-03-05 17:31:48
'''

from enum import Enum
from pydantic import BaseModel


class VdbTypeEnum(Enum):
    tencent = "tencent"
    zilliz = "zilliz"
    es = "es"


class VectorEntity(BaseModel):
    uuid: str
    file_uuid: str
    vector: list[float]


class TextWithoutVecEntity(BaseModel):
    uuid: str
    file_uuid: str
    text: str


class PersonalVectorEntity(BaseModel):
    uuid: str
    file_uuid: str
    user_id: str
    vector: list[float]


class PersonalTextWithoutVecEntity(BaseModel):
    uuid: str
    file_uuid: str
    text: str
    user_id: str
