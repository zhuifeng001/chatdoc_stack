'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-30 15:55:24
LastEditors: longsion
LastEditTime: 2024-06-19 20:14:30
'''


import copy
from pkg.es.es_doc_fragment import DocFragmentES, DocFragmentModel
from pkg.es.es_doc_item import DocItemModel, DocItemES
from pkg.es.es_doc_table import DocTableModel
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.utils.transform import html2markdown
from pkg.utils import duplicates_list


def fillin_doc_items_cache(doc_item_cache, uuid_ori_id_tuples: list[tuple[str, str]]) -> list[DocItemModel]:
    '''
    description: 填充doc_item的cache
    return {*}
    '''
    to_request_dict: dict[str, int] = {}

    for idx, uuid_ori_id_tuple in enumerate(uuid_ori_id_tuples):
        uuid, ori_id = uuid_ori_id_tuple
        hashkey = f"{uuid}|{ori_id}"
        if hashkey not in doc_item_cache:
            to_request_dict[uuid_ori_id_tuple] = idx

    if to_request_dict:
        max_batch_size = 1000
        to_request_list = list(to_request_dict.keys())
        threads = []
        for i in range(0, len(to_request_list), max_batch_size):
            t = ThreadWithReturnValue(target=DocItemES().get_by_uuid_ori_tuples, kwargs=dict(pairs=to_request_list[i:i + max_batch_size]))
            t.start()
            threads.append(t)

        for t in threads:
            doc_items = t.join()
            for doc_item in doc_items:
                for ori_id in doc_item.ori_id:
                    hashkey = f"{doc_item.uuid}|{ori_id}"
                    doc_item_cache[hashkey] = doc_item


def fillin_fragment_parent_cache(fragment_cache: dict[str, DocFragmentModel], fragments: list[DocFragmentModel], level: int = None):
    '''
    description: 填充节点的父节点的fragment_cache
    return {*}
    '''
    _fragments = fragments
    level_cnt = 0
    while _fragments:
        fragment_cache.update({item.uuid: item for item in _fragments})
        if level and level <= level_cnt:
            break

        uncached_parent_uuids = [item.parent_frament_uuid for item in _fragments if item.parent_frament_uuid and item.parent_frament_uuid not in fragment_cache]
        uncached_parent_uuids = list(set(uncached_parent_uuids))
        _fragments = DocFragmentES().get_by_uuids(uncached_parent_uuids) if uncached_parent_uuids else []
        level_cnt += 1


def fillin_fragment_children_cache(fragment_cache: dict[str, DocFragmentModel], fragments: list[DocFragmentModel]):
    '''
    description: 填充节点的子节点的fragment_cache，并返回相应的ori_id列表，用做uuid_ori_id缓存
    return {*}
    '''
    _fragments = fragments
    uuid_ori_tuple_list = list()
    while _fragments:
        uuid_ori_tuple_list.extend([(fragment.file_uuid, ori_id) for fragment in _fragments for ori_id in fragment.ori_id])
        children_uuids = [uuid for item in _fragments for uuid in item.children_fragment_uuids]
        uncached_children_uuids = [uuid for uuid in children_uuids if uuid not in fragment_cache]
        if uncached_children_uuids:
            uncached_children_uuids = list(set(uncached_children_uuids))
            children = DocFragmentES().get_by_uuids(uncached_children_uuids)
            for item in children:
                fragment_cache[item.uuid] = item

        _fragments = [fragment_cache[uuid] for uuid in children_uuids]

    return uuid_ori_tuple_list


def get_fragment_ori_ids(fragment: DocFragmentModel, fragment_cache: dict[str, DocFragmentModel]):
    '''
    description: 通过缓存获取 fragment的ori_ids， 补充填满【fragment_cache中包含该节点的所有子孙节点的Fragment】
    return {*}
    '''
    if fragment.leaf:
        return fragment.ori_id

    ori_ids = copy.copy(fragment.ori_id)

    children_ori_ids = [
        get_fragment_ori_ids(fragment_cache[child_uuid], fragment_cache)
        for child_uuid in fragment.children_fragment_uuids
    ]

    children_ori_ids = duplicates_list(children_ori_ids, lambda x: "|".join(x))

    for child_ori_ids in children_ori_ids:
        ori_ids.extend(child_ori_ids)

    ori_ids = list(set(ori_ids))
    # ["1,3", "101,2", "1,2", "2,1", "100,3"].sort(key=lambda x: tuple([int(_x) for _x in x.split(",")])) => ['1,2', '1,3', '2,1', '100,3', '101,2']
    ori_ids.sort(key=lambda x: tuple([int(_x) for _x in x.split(",")]))

    return ori_ids


def get_fragment_ori_text(fragment: DocFragmentModel, fragment_cache: dict[str, DocFragmentModel], doc_items_cache: dict[str, DocItemModel]):
    '''
    description: 通过缓存获取 fragment的text， 补充填满【fragment_cache中包含该节点的所有子孙节点的Fragment】，doc_items_cache中也包含了【ori_id的缓存】
    return {*}
    '''
    if not fragment.ori_id:
        return ""

    fragment_content = doc_items_cache[f"{fragment.file_uuid}|{fragment.ori_id[0]}"].content
    if fragment.leaf:
        if fragment_content.startswith("<table border="):
            return html2markdown(fragment_content)
        else:
            return fragment_content

    # 先直接去全部的
    # 后续： 如果不超过字数限制，则取全部的，否则按照层级去获取，依次扩充到总数超过2000为止
    child_ori_texts = [
        get_fragment_ori_text(fragment_cache[child_uuid], fragment_cache, doc_items_cache)
        for child_uuid in fragment.children_fragment_uuids if fragment_cache[child_uuid].parent_frament_uuid == fragment.uuid
    ]

    child_ori_texts = duplicates_list(child_ori_texts)

    return "#" * (fragment.level + 1) + " " + fragment_content + "\n" + "\n".join(child_ori_texts)


def get_fragment_all_texts(fragment: DocFragmentModel, fragment_cache: dict[str, DocFragmentModel], doc_items_cache: dict[str, DocItemModel]):
    '''
    description: 通过缓存获取 fragment的text列表， 补充填满【fragment_cache中包含该节点的所有子孙节点的Fragment】，doc_items_cache中也包含了【ori_id的缓存】
    return {*}
    '''
    if not fragment.ori_id:
        return []

    fragment_content = doc_items_cache[f"{fragment.file_uuid}|{fragment.ori_id[0]}"].content
    if fragment.leaf:
        if fragment_content.startswith("<table border="):
            return [html2markdown(fragment_content)]
        else:
            return [fragment_content]

    # 先直接去全部的
    # 后续： 如果不超过字数限制，则取全部的，否则按照层级去获取，依次扩充到总数超过2000为止
    texts = [fragment_content]

    children_texts = []
    for child_uuid in fragment.children_fragment_uuids:
        if fragment_cache[child_uuid].parent_frament_uuid == fragment.uuid:
            children_texts.extend(get_fragment_all_texts(fragment_cache[child_uuid], fragment_cache, doc_items_cache))

    children_texts = duplicates_list(children_texts)
    texts.extend(children_texts)

    return texts


def get_table_ori_text(doc_table: DocTableModel, doc_ori_cache: dict[str, DocItemModel]):
    '''
    description: 通过缓存获取 table的text， 补充填满【fragment_cache中包含该节点的所有子孙节点的Fragment】，doc_items_cache中也包含了【ori_id的缓存】
    return {*}
    '''

    if not doc_table.ori_id:
        return ""

    fragment_content = doc_ori_cache[f"{doc_table.uuid}|{doc_table.ori_id[0]}"].content
    if fragment_content.startswith("<table border="):
        return html2markdown(fragment_content)

    else:
        return fragment_content
