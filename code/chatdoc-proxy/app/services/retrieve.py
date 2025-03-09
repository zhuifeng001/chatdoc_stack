'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-07-16 17:25:45
LastEditors: longsion
LastEditTime: 2024-10-18 15:49:38
'''


from functools import cache
from pydantic import BaseModel
from app.services.embedding import get_similar_top_n
from app.services.es_retrieval import EmbeddingArgs, es_retrieve
from app.utils.thread_with_return_value import ThreadWithReturnValue
from app.utils.utils import edit_distance, ensure_list
from app.utils.logger import log_msg, logger
from app.services.es import global_es
from app.config import config

consolidated_income_table = '合并利润表'
consolidated_balance_table = '合并资产负债表'
consolidated_cash_flow_table = '合并现金流量表'
consolidated_income_table_keys = ['营业外收入', '利息支出', '综合收益总额', '所得税费用', '投资收益', '研发费用', '利润总额', '净利润', '税金及附加', '营业外支出', '每股收益', '归属于母公司所有者的净利润',
                                  '销售费用', '公允价值变动收益', '归属于母公司股东的净利润', '管理费用', '利息收入', '营业收入', '对联营企业和合营企业的投资收益', '营业成本', '营业利润', '财务费用']

consolidated_balance_table_keys = ['衍生金融资产', '无形资产', '其他非流动金融资产', '资产总计', '流动资产',
                                   '非流动负债', '负债合计', '固定资产', '流动负债', '总负债', '货币资金', '应收款项融资', '存货', '应付职工薪酬']

consolidated_cash_flow_table_keys = ['收回投资收到的现金', '现金及现金等价物', '期末现金及现金等价物余额']
three_table_key_list = [*consolidated_income_table_keys, *consolidated_balance_table_keys, *consolidated_cash_flow_table_keys]


@cache
def get_model_json_schema(cls):
    return cls.model_json_schema()


class EsBaseItem(BaseModel):

    created_at: str = ""

    @classmethod
    def keys(cls, exclude=[]):
        all_keys = list(get_model_json_schema(cls)["properties"].keys())
        return [key for key in all_keys if key not in exclude]

    @classmethod
    def from_hit(cls, hit: dict):
        for key, _property in get_model_json_schema(cls)["properties"].items():
            if key in hit and _property["type"] == "array":
                hit[key] = ensure_list(hit[key])

        return cls(**hit)


class DocTableModel(EsBaseItem):
    uuid: str = None
    title: str = ""
    ori_id: list[str] = []
    type: str = None           # 表格类型： 三大表|...
    row_id: int = -1           # 行id  markdown2list 之后的行号
    keywords: list[str] = []   # 关键词列表【BM25搜索】 行B字段
    ebed_text: str = ""        # embedding字符串


class DocFragmentModel(EsBaseItem):
    uuid: str = ""                  # 切片唯一标识uuid
    file_uuid: str = ""             # 文件uuid
    ori_id: list[str] = []          # 定位用id
    type: str = "text"              # 切片类型 text/table/title
    ebed_text: str = ""             # 用于emebedding的text

    parent_frament_uuid: str = ""   # 父级片段uuid
    children_fragment_uuids: list[str] = []  # 子级片段uuid

    tree_token_length: int = 0      # 节点及子节点token长度
    token_length: int = 0           # 当前节点token长度
    level: int = 1                  # 切片所在文档树level，从1开始

    # ---- leaf切片属性 ----
    leaf: bool = False              # 是否是叶子节点
    leaf_split_idx: int = 1         # leaf 节点切分的节点index，从1开始
    leaf_split_num: int = 1         # leaf 节点切分的节点总数
    leaf_start_offset: int = 0      # 起始偏移【相对ori_id中的偏移】
    leaf_end_offset: int = 0        # 结束偏移

    table_title_row_idx: int = 0    # 表格标题行
    table_start_row_idx: int = 0    # 表格起始行
    table_end_row_idx: int = 0      # 表格结束行


class QuestionAnalysisResult(BaseModel):
    is_comparative_question: bool = False
    companies: list[str] = []
    extract_companies: list[str] = []
    years: list[str] = []
    rewrite_question: str = ""
    retrieve_question: str = ""
    keywords: list[str] = []


class OtherParams(BaseModel):
    fixed_table_keyword_threshold: float = 0.6
    uuid: str = ""


class Context(BaseModel):

    # 问题解析结果
    question_analysis: QuestionAnalysisResult = QuestionAnalysisResult()
    other_params: OtherParams = OtherParams()


class Response(BaseModel):
    fixed_table_retrieve_small: list[DocTableModel]
    normal_table_retrieve_small: list[DocTableModel]
    fragment_retrieve_small: list[DocFragmentModel]


@log_msg
def retrieve_small_by_document(context: Context):
    document_uuids = [context.other_params.uuid]
    # 三大表召回
    fixed_table_retrieve_small = retrieve_by_fixed_table(context.question_analysis, context.other_params, document_uuids)
    fixed_table_file_uuids = [cur.uuid for cur in fixed_table_retrieve_small]

    # 文件三大表召回到了之后其他的召回就省略掉
    document_uuids = list(set(document_uuids) - set(fixed_table_file_uuids))
    if document_uuids:
        _normal_table_retrieve_t = ThreadWithReturnValue(target=retrieve_by_table, args=(context, document_uuids))
        _normal_table_retrieve_t.start()

        _paragraph_retrieve_t = ThreadWithReturnValue(target=retrieve_by_paragraph, args=(context, document_uuids))
        _paragraph_retrieve_t.start()

        normal_table_retrieve_small = _normal_table_retrieve_t.join()
        fragment_retrieve_small = _paragraph_retrieve_t.join()

    else:
        normal_table_retrieve_small = []
        fragment_retrieve_small = []

    return Response(fixed_table_retrieve_small=fixed_table_retrieve_small,
                    normal_table_retrieve_small=normal_table_retrieve_small,
                    fragment_retrieve_small=fragment_retrieve_small)


def retrieve_by_fixed_table(question_analysis: QuestionAnalysisResult, other_params: OtherParams, document_uuids: list[str]) -> list[DocTableModel]:
    empty_list = []
    if len(question_analysis.keywords) != 1:
        logger.info(f"Fixed Table Agent 仅限于关键词数量为1，keywords: {question_analysis.model_dump()}")
        return empty_list

    keyword = question_analysis.keywords[0]
    # """语义匹配top1"""
    top1 = get_similar_top_n(three_table_key_list, keyword)
    if not top1:
        logger.info(f"Fixed Table Agent 匹配不到关键词对应的表格，keyword: {keyword}")
        return empty_list

    vector_similarly = edit_distance_similarly = other_params.fixed_table_keyword_threshold
    table_keyword, score = top1[0]

    if score < vector_similarly:
        logger.info(f'similar_score: {score} < fixed_table_keyword_threshold: {float(vector_similarly)}')
        return empty_list

    edit_distance_score = 1 - edit_distance(table_keyword, keyword) / max(len(table_keyword), len(keyword))
    if edit_distance_score < edit_distance_similarly:
        logger.info(f'edit_distance_score: {edit_distance_score} < fixed_table_keyword_threshold: {edit_distance_similarly}')
        return empty_list

    titles = match_fixed_tables(table_keyword)

    # Search Code

    condition_should = [
        dict(
            match_phrase=dict(title=title)
        )
        for title in titles
    ]
    condition_must = [
        dict(match=dict(keywords=keyword)),
    ]
    condition_filter = [
        dict(terms=dict(uuid=document_uuids)),
        dict(term=dict(type="three_table")),
    ]
    op_fields = DocTableModel.keys(exclude=["acge_embedding", "peg_embedding"])
    search_body = {
        "_source": op_fields,
        "query": {
            "bool": {
                "should": condition_should,
                "must": condition_must,
                "filter": condition_filter,
                "minimum_should_match": 1,
            }
        },
    }
    hits = global_es.search_with_hits(config["es"]["index_doc_table"], search_body)
    return [
        DocTableModel(**hit["_source"]) for hit in hits
    ]


def retrieve_by_table(context: Context, document_uuids: list[str]) -> list[DocTableModel]:
    # 表格召回
    doc_table_items: list[DocTableModel] = []

    for keyword in context.question_analysis.keywords:
        keyword_items = es_retrieve(index=config["es"]["index_doc_table"],
                                    text=keyword,
                                    text_for_embedding=context.question_analysis.retrieve_question,
                                    text_field="keywords",
                                    bm25_size=20,
                                    op_fields=DocTableModel.keys(exclude=["acge_embedding", "peg_embedding"]),
                                    embedding_args=[],
                                    must_conditions=[dict(terms=dict(uuid=document_uuids))],
                                    )

        doc_table_items.extend(keyword_items)

    return doc_table_items


def retrieve_by_paragraph(context: Context, document_uuids: list[str]) -> list[DocFragmentModel]:
    # 段落召回
    doc_fragment_items: list[DocFragmentModel] = es_retrieve(index=config["es"]["index_doc_fragment"],
                                                             text=context.question_analysis.retrieve_question,
                                                             text_for_embedding=context.question_analysis.retrieve_question,
                                                             text_field="ebed_text",
                                                             bm25_size=20,
                                                             op_fields=DocFragmentModel.keys(exclude=["acge_embedding", "peg_embedding"]),
                                                             embedding_args=[EmbeddingArgs(field="acge_embedding", size=20, dimension=1024)],
                                                             must_conditions=[dict(terms=dict(file_uuid=document_uuids))],
                                                             )

    return doc_fragment_items


def match_fixed_tables(table_keyword: str):
    if table_keyword in consolidated_income_table_keys:
        return [consolidated_income_table]
    if table_keyword in consolidated_balance_table_keys:
        return [consolidated_balance_table]
    if table_keyword in consolidated_cash_flow_table_keys:
        return [consolidated_cash_flow_table]
