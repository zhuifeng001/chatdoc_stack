'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-09-20 19:13:01
LastEditors: longsion
LastEditTime: 2024-09-27 18:18:27
'''


from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from .objects import DeleteParams


def process(params: DeleteParams) -> bool:
    from pkg.es.es_doc_fragment import DocFragmentES
    from pkg.es.es_doc_table import DocTableES
    from pkg.es.es_doc_item import DocItemES
    from pkg.es.es_file import FileES
    from pkg.vdb import delete_vdb_uuids

    # 删除文件：需要删除个人知识库ES中的内容，也需要删除向量库中的内容

    es_threads = []
    for func in [DocFragmentES().delete_by_file_uuids,
                 DocTableES().delete_by_file_uuids,
                 DocItemES().delete_by_file_uuids,
                 FileES().delete_by_file_uuids]:
        t = ThreadWithReturnValue(target=func, args=(params.uuids,), kwargs=dict(wait_delete=True))
        t.start()
        es_threads.append(t)

    # 删除向量库的向量
    result = delete_vdb_uuids(params.uuids)

    for t in es_threads:
        result = result and (t.join() is None)

    # TODO: 删除AWS源文件【暂时先不删除了】

    return result
