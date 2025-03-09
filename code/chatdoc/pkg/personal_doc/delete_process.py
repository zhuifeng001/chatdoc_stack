'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-09-20 15:22:49
LastEditors: longsion
LastEditTime: 2024-09-27 18:18:12
'''


from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.vdb import delete_personal_vdb
from .objects import DeleteParams
from pkg.es.es_p_doc_fragment import PDocFragmentES
from pkg.es.es_p_doc_table import PDocTableES
from pkg.es.es_p_doc_item import PDocItemES
from pkg.es.es_p_file import PFileES


def process(params: DeleteParams) -> bool:

    # 删除文件：需要删除个人知识库ES中的内容，也需要删除向量库中的内容

    es_threads = []
    for func in [PDocFragmentES().delete_by_user_and_file_uuids,
                 PDocTableES().delete_by_user_and_file_uuids,
                 PDocItemES().delete_by_user_and_file_uuids,
                 PFileES().delete_by_user_and_file_uuids]:
        t = ThreadWithReturnValue(target=func, args=(params.user_id, params.uuids,), kwargs=dict(wait_delete=True))
        t.start()
        es_threads.append(t)

    # 删除向量库的向量
    result = delete_personal_vdb(params.user_id, params.uuids)

    for t in es_threads:
        result = result and (t.join() is None)

    # TODO: 删除AWS源文件【暂时先不删除了】

    return True
