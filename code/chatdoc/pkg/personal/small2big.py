'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-30 17:03:20
LastEditors: longsion
LastEditTime: 2024-09-20 16:41:12
'''


from pkg.personal.common import fillin_doc_items_cache, fillin_fragment_children_cache, fillin_fragment_parent_cache, get_fragment_all_texts, get_fragment_ori_ids, get_fragment_ori_text
from pkg.personal.objects import Context, RetrieveContext, RetrieveType
from pkg.utils.decorators import register_span_func
from pkg.utils import group_by_func


def lambda_func(context: Context):

    return context.model_dump(include=[
        "params",
        "trace_id",
        "rewrite_question",
        "rerank_retrieve_before_qa",
    ])


@register_span_func(func_name="Small2Big", span_export_func=lambda_func)
def small2big(context: Context) -> Context:
    """
    贪婪获取父子切片合并
    """
    para_fragments = [
        r_context.origin for r_context in context.rerank_retrieve_before_qa
        if r_context.retrieval_type == RetrieveType.PARAGRAPH and r_context.origin.tree_token_length < 2000 and r_context.origin.parent_frament_uuid and r_context.origin.leaf
    ]
    # 补齐Cache
    fillin_fragment_parent_cache(context.fragment_cache, para_fragments, level=1)
    parent_fragments = [context.fragment_cache[para_fragment.parent_frament_uuid] for para_fragment in para_fragments if para_fragment.parent_frament_uuid]
    uuid_ori_tuple_list = fillin_fragment_children_cache(context.fragment_cache, parent_fragments)
    fillin_doc_items_cache(context.doc_items_cache, context.params.user_id, uuid_ori_tuple_list)

    # 开始判断是否使用当前节点Or父结点
    new_r_contexts = []

    # 多文档时候处理，确保每个文件有一个召回
    # A1 B1 C1 之后就按照 rerank分数来获取
    context.rerank_retrieve_before_qa = sort_by_multiple_documents(context)
    # 贪婪去添加片段
    for r_context in context.rerank_retrieve_before_qa:
        # 与之前节点有ori_id重合，则不添加进去，添加到related当中
        for pre_context in new_r_contexts:
            if r_context.intersect(pre_context):
                pre_context.related.append(r_context.origin)
                break
        else:
            if r_context.retrieval_type in [RetrieveType.FIXED_TABLE, RetrieveType.NORMAL_TABLE]:
                new_r_contexts.append(r_context)
                continue

            # 段落小于2000token，且存在父结点，使用父结点，否则使用当前节点
            if r_context.origin.tree_token_length < 2000 and r_context.origin.parent_frament_uuid and r_context.origin.leaf and r_context.origin.parent_frament_uuid in context.fragment_cache and r_context.origin.level > 2:
                # 添加parent进去
                parent_fragment = context.fragment_cache[r_context.origin.parent_frament_uuid]
                pr_context = RetrieveContext(
                    origin=parent_fragment,
                    related=[r_context.origin],
                    question_rerank_score=r_context.question_rerank_score,
                    retrieve_rank_score=r_context.retrieve_rank_score,
                    repeat_score=r_context.repeat_score,
                    rerank_score_before_llm=r_context.rerank_score_before_llm,
                    retrieval_type=RetrieveType.PARAGRAPH,
                    tree_ori_ids=get_fragment_ori_ids(parent_fragment, context.fragment_cache),
                    tree_text=get_fragment_ori_text(parent_fragment, context.fragment_cache, context.doc_items_cache),
                    tree_all_texts=get_fragment_all_texts(parent_fragment, context.fragment_cache, context.doc_items_cache),
                )
                for pre_context in new_r_contexts:
                    if pr_context.intersect(pre_context):
                        pre_context.related.append(parent_fragment)
                        break
                else:
                    new_r_contexts.append(pr_context)
            else:
                new_r_contexts.append(r_context)

    context.rerank_retrieve_before_qa = new_r_contexts
    return context


def sort_by_multiple_documents(context: Context) -> list[RetrieveContext]:
    '''
    description: # 超过3份文档, 每份文档召回取top3
    return {*}
    '''
    if len(context.locationfiles) < 4:
        first_contexts = [r_contexts[0] for file_uuid, r_contexts in group_by_func(context.rerank_retrieve_before_qa, keyfunc=lambda x: x.file_uuid) if r_contexts]

        other_contexts = [
            _context for _context in context.rerank_retrieve_before_qa if _context not in first_contexts
        ]

        new_retieve_list = first_contexts + other_contexts

        return new_retieve_list
    else:
        new_retieve_list = [r_contexts[0:3] for file_uuid, r_contexts in group_by_func(context.rerank_retrieve_before_qa, keyfunc=lambda x: x.file_uuid) if r_contexts]
        return [item for sub_list in new_retieve_list for item in sub_list]
