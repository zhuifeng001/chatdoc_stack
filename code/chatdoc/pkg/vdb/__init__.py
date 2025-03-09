'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-06-14 11:22:41
LastEditors: longsion
LastEditTime: 2025-03-07 14:39:56
'''

from pkg.doc.objects import VectorEntity
from pkg.config import config


def get_vector_db_model():
    return config['vector']['model']


if get_vector_db_model() == 'zilliz':
    from pkg.vdb.zilliz import delete_entities
    from pkg.vdb.zilliz import delete_personal_entities
    from pkg.vdb.zilliz import delete_entities_by_uuids
elif get_vector_db_model() == 'tencent':
    from pkg.vdb.tencent import delete_entities
    from pkg.vdb.tencent import delete_personal_entities
    from pkg.vdb.tencent import delete_entities_by_uuids
else:
    print(f'vector db model is {get_vector_db_model()}, 不需要删除')


def get_vector_db_config():
    if get_vector_db_model() not in ('tencent', 'zilliz'):
        return True
    return config[get_vector_db_model()] or {}


def delete_vdb(file_uuid: str):
    if get_vector_db_model() not in ('tencent', 'zilliz'):
        return True
    return delete_entities(file_uuid=file_uuid)


def delete_vdb_uuids(file_uuids: list[str]):
    if get_vector_db_model() not in ('tencent', 'zilliz'):
        return True
    return delete_entities_by_uuids(file_uuids=file_uuids)


def delete_personal_vdb(user_id: str, file_uuids: list[str]):
    if get_vector_db_model() not in ('tencent', 'zilliz'):
        return True
    return delete_personal_entities(user_id, file_uuids)
