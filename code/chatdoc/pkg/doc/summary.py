'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-17 11:21:01
LastEditors: longsion
LastEditTime: 2024-06-03 14:58:56
'''


from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import Optional
from pkg.llm.template_manager import TemplateManager
from pkg.utils.jaeger import TracedThreadPoolExecutor
from .objects import Context, DocTreeNode
from pkg.llm.llm import LLM
from pkg.es.es_file import FileES

from pkg.utils.decorators import register_span_func


class DocTreeEnhanceNode:

    def __init__(self, ori_node: DocTreeNode, parent: "DocTreeEnhanceNode" = None, level: int = 0) -> None:
        self.ori_node : DocTreeNode = ori_node
        self.parent : Optional["DocTreeEnhanceNode"] = parent
        self.token_num = len(self.content)
        self.summary: Optional[str] = None
        self.keywords: list[str] = []
        self.children: list["DocTreeEnhanceNode"] = []
        self.tree_content: str = self.content
        self.level: int = level

    @property
    def label(self):
        return self.ori_node.label

    @property
    def content(self):
        if not self.ori_node.content:
            return ""
        return self.ori_node.content[0]

    @classmethod
    def load_from_ori(cls, node: DocTreeNode, parent: "DocTreeEnhanceNode" = None, level: int = 0) -> "DocTreeEnhanceNode":
        """
        根据节点信息创建或获取节点
        """
        enhance_node = DocTreeEnhanceNode(
            ori_node=node,
            parent=parent,
            level=level,
        )

        if node.children:
            enhance_node.children = [cls.load_from_ori(child, parent=enhance_node, level=level + 1) for child in node.children]
            enhance_node.token_num += sum([child.token_num for child in enhance_node.children])
            enhance_node.tree_content = (level + 1) * "#" + " " + enhance_node.content + "\n"
            enhance_node.tree_content += "\n".join([child.tree_content for child in enhance_node.children])

        return enhance_node


@register_span_func(func_name="文档总结", span_export_func=lambda context: context.model_dump(
    include=[
        "params",
        "trace_id",
        "document_summary",
        "document_keywords",
        "document_tree_summaries",
    ])
)
def summary_document(context: Context) -> Context:
    """
    文档总结，并抽取文档关键词，关键信息，用于构建知识库召回
    """

    enhance_root = DocTreeEnhanceNode.load_from_ori(context.doc_tree.tree[0])

    context.document_summary, context.document_keywords = summarize_tree(enhance_root, max_token=28000)

    context.document_tree_summaries = [
        node.summary for node in enhance_root.children
    ]

    context.file_meta.summary = context.document_summary
    context.file_meta.keywords = context.document_keywords
    context.file_meta.tree_summaries = context.document_tree_summaries

    # 更新es对象
    FileES().update_file(context.file_meta.uuid,
                         summary=context.file_meta.summary,
                         document_keywords=context.document_keywords,
                         tree_summaries=context.file_meta.tree_summaries)

    return context


def summarize_tree(root: DocTreeEnhanceNode, max_token: int) -> str:
    """
    遍历树进行总结，返回所有需要总结的节点的总结内容列表
    """
    # 主循环，查找并处理超过max_token的最小子树
    while True:
        longest_subtrees = find_longest_subtrees(root, max_token)
        if not longest_subtrees or root in longest_subtrees:  # 所有节点均不超过限制|仅root节点超过，结束循环
            break

        # 对找到的子树进行总结
        for subtree_root in longest_subtrees:
            subtree_root.summary, subtree_root.keywords = map_reduce_summary(subtree_root, max_token)
            # 更新 token_num
            token_minus = subtree_root.token_num - len(subtree_root.summary)
            t = subtree_root
            while t:
                t.token_num -= token_minus
                t = t.parent

    return map_reduce_summary(root, max_token)


def find_longest_subtrees(root: DocTreeEnhanceNode, max_token: int) -> list[DocTreeEnhanceNode]:
    """找到所有超过max_token长度的最小子树，确保这些子树没有自己的子节点也超过限制"""
    queue = [root]
    longest_subtrees = []

    while queue:
        current = queue.pop(0)

        if current.token_num > max_token:
            # 确保当前节点没有子节点超过max_token
            if not current.children or all(child.token_num <= max_token for child in current.children):
                longest_subtrees.append(current)
            else:  # 如果有子节点超过限制，则继续探索这些子节点
                queue.extend(child for child in current.children if child.token_num > max_token)

    return longest_subtrees


def map_reduce_summary(node: DocTreeEnhanceNode, max_token: int = 30000) -> tuple[str, list[str]]:
    """对节点进行MapReduceSummary操作，返回总结后的内容列表"""

    keywords = []

    # leaf node text
    if node.label == "Text":
        splits = RecursiveCharacterTextSplitter(chunk_size=max_token, chunk_overlap=200).split_text(node.content)
        with TracedThreadPoolExecutor() as executor:
            futures = [executor.submit(llm_summary, split) for split in splits]
        summaries = [f.result() for f in futures]

        if len(summaries) >= 2:
            return llm_summary("\n".join(summaries), is_combine=True), keywords

        else:
            return summaries[0], keywords

    # leaf node table
    elif node.label == "Table":
        return llm_summary(node.content, is_table=True), keywords

    elif node.children:
        # all leaf node 没有超过
        child_summaries = []
        _temp_nodes = []
        _temp_token = 0

        for child in node.children:
            if child.summary:
                if _temp_nodes:
                    child_summaries.append(_temp_nodes)
                    _temp_nodes = []
                    _temp_token = 0

                child_summaries.append(child.summary)

            elif child.token_num + _temp_token > max_token:
                child_summaries.append(_temp_nodes)
                _temp_nodes = []
                _temp_token = 0

            else:
                _temp_nodes.append(child)
                _temp_token += child.token_num

        if _temp_nodes:
            child_summaries.append(_temp_nodes)

        with TracedThreadPoolExecutor() as executor:
            futures = []
            for split in child_summaries:
                if isinstance(split, list):
                    split: list[DocTreeEnhanceNode]
                    futures.append(executor.submit(llm_summary, "\n\n".join([c.tree_content for c in split])))

        summaries = [f.result() for f in futures]
        for idx, summary in enumerate(child_summaries):
            if isinstance(summary, str):
                summaries.insert(idx, summary)

        if len(summaries) >= 2:
            return llm_summary("\n".join([node.content] + summaries), is_combine=True), keywords

        else:
            return summaries[0], keywords

    else:
        return node.content, keywords


def llm_summary(text: str, is_combine=False, is_table=False) -> str:
    if is_combine:
        prompt = "Combine these summaries: {text}"

    elif is_table:
        prompt = "Summarize this table: {text}"

    else:
        prompt = "Summarize this content: {text}"

    """使用LLM进行总结"""
    return LLM().chat(prompt.format(text=text), system_message=TemplateManager().get_template('qa_system_normal').format())
