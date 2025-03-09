
"""
功能：将pdf2md中detail的结果转成tree格式
detail中的字段名解释：
outline_level:标题级别：(最多支持五级标题) -1.正文 0.一级标题 1.二级标题
text: 文本
content: 0 正文(段落、图片、表格) 1 非正文(页眉、页脚、侧边栏)
"""


import json
from itertools import groupby
from pkg.doc.objects import DocTreeGenerateNode, DocTreeNode


def TreeBuild(preorder):
    if not preorder:
        return None

    root = DocTreeNode(
        content=[preorder[0]["text"]],
        page_id=preorder[0]["page_id"],
        tree_level=preorder[0]["tree_level"] + 1,
        label=preorder[0]["label"],
        pos=preorder[0]["position"],
        ori_id=[str(preorder[0]["page_id"] - 1) + ","
                + str(preorder[0]["paragraph_id"])]
    )
    stack = [(root, root.tree_level - 1)]

    for ind, p in enumerate(preorder[1:]):
        depth = preorder[ind + 1]["tree_level"]
        while stack and stack[-1][1] >= depth:
            stack.pop()

        node = DocTreeNode(
            content=[p["text"]],
            page_id=p["page_id"],
            tree_level=p["tree_level"] + 1,
            label=p["label"],
            pos=p["position"],
            ori_id=[str(p["page_id"] - 1) + "," + str(p["paragraph_id"])]
        )
        if stack:
            stack[-1][0].children.append(node)
        stack.append((node, depth))

    return root


def build_tree_by_page(md_detail):
    """
    Args:
        md_detail: pdf2md的结果

    Returns:
        按页切分建树的结果

    """
    # 构造基础目录树
    tree = DocTreeNode(
        label="ROOT",
        page_id=0,
        pos=[
            0,
            0,
            1,
            0,
            1,
            1,
            0,
            1
        ],
        ori_id=["-1,-1"],
        content=["ROOT"],
        tree_level=0
    )
    # 去掉页眉页脚
    md_detail = [d for d in md_detail if d["content"]
                 != 1 or d["text"].strip() != ""]
    grouped_data = groupby(md_detail, key=lambda x: x["page_id"])
    for page_id, group in grouped_data:
        page = DocTreeNode(page_id=page_id)
        grouped_items = list(group)
        for ind, item in enumerate(grouped_items):
            if ind == 0:
                page.label = "Heading"
                page.pos = item["position"]
                page.ori_id = [str(item["page_id"] - 1) + ","
                               + str(item["paragraph_id"])]
                page.content = [item["text"]]
                page.tree_level = 1
            else:
                leaf_node = DocTreeNode(page_id=page_id)
                leaf_node.label = "Table" if item["type"] == "table" else "Text"
                leaf_node.pos = item["position"]
                leaf_node.ori_id = [
                    str(item["page_id"] - 1) + "," + str(item["paragraph_id"])]
                leaf_node.content = [item["text"]]
                leaf_node.tree_level = 2
                page.children.append(leaf_node)
        tree.children.append(page)

    return tree


def detail_process(md_detail, keep_hierarchy=False):
    """
    Args:
        md_detail: pdf2md的结果

    Returns:
        按阅读顺序建树的结果
    """
    def remove_title(title):
        key_info = ["表", "图", "Fig", "FIG", "fig", "Table", "TABLE", "table"]
        res = [k for k in key_info if k in title]
        if res != []:
            return True
        else:
            return False

    label_dic = {"paragraph": "Text", "image": "Text", "table": "Table"}
    new_detail = [{
        "label": "ROOT",
        "tags": [],
        "paragraph_id": -1,
        "page_id": 0,
        "content": 1,
        "position": [
            0,
            0,
            1,
            0,
            1,
            1,
            0,
            1
        ],
        "tree_level": -1,
        "text": "ROOT"
    }]
    # 用来记录层级
    tree_level = -1  # root节点
    for d in md_detail:
        if d["content"] == 1 or d["text"].strip() == "":
            continue
        # 上级节点为ROOT时，第一个出现的标题节点层级应该为0，纠正模型预的层级结果
        if tree_level == -1 and d["outline_level"] not in [0, -1]:
            d["outline_level"] = 0
        if tree_level == -1:
            # 上文未出现过标题，所有的节点都是一级层级
            d["tree_level"] = 0
            d["label"] = label_dic[d["type"]]
        if d["outline_level"] != -1:
            if keep_hierarchy:
                d["tree_level"] = d["outline_level"]
                tree_level = d["outline_level"]
            else:
                d["tree_level"] = 0
                tree_level = 0
            d["label"] = "Heading"
            # 非标题节点为下一级，且将 表格标题与图片标题 去除层级
        if tree_level != -1 and (d["outline_level"] == -1 or remove_title(d["text"])):
            d["tree_level"] = tree_level + 1
            d["label"] = label_dic[d["type"]]

        new_detail.append(d)

    return new_detail


def tree_generate(tree: DocTreeNode):

    result = []
    if tree.children:
        if tree.tree_level > 0:
            result.append(
                DocTreeGenerateNode(
                    content=tree.content[0] if tree.content else "",
                    pageNum=tree.page_id,
                    pos=tree.pos,
                    level=tree.tree_level)
            )
        for child in tree.children:
            result.extend(
                tree_generate(child)
            )

    return result


if __name__ == "__main__":

    jsonpath = "/home/kecheng_shen@intsig.com/下载/textin_test/pdf2md/1180021_9b772cf5c1004f59028a4c3d66dff112.json"
    pdf2md_res = json.load(open(jsonpath, "r"))
    md_detail = pdf2md_res["result"]["detail"]
    # 构造包含层级的树【系统知识库】
    new_detail = detail_process(md_detail, keep_hierarchy=True)
    # 构造不包含层级的树【个人知识库】
    new_detail = detail_process(md_detail, keep_hierarchy=False)
    tree = TreeBuild(new_detail)
    # 按页切片构造树【PPT】
    # tree = build_tree_by_page(md_detail)
    print("*********")
    # 输出树的结构

    def printTree(node, level=-1):
        if node is not None:
            print(' ' * 4 * (level + 1) + '|--', node.content, node.tree_level)
            for child in node.children:
                printTree(child, level + 1)
    printTree(tree)
