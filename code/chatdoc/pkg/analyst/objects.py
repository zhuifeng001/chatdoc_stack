'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-27 14:32:49
LastEditors: longsion
LastEditTime: 2024-10-22 11:05:25
'''
from pkg.es.es_file import ESFileObject
from pkg.es.es_company import ESCompanyObject
from pkg.es.es_doc_table import DocTableModel
from pkg.es.es_doc_fragment import DocFragmentModel
from pkg.es.es_doc_item import DocItemModel

from enum import Enum
from pydantic import BaseModel
import typing


class Params(BaseModel):

    question: str
    no_chat: bool = None
    compliance_check: bool = True
    stream: bool = False
    document_uuids: list[str] = None


class Response(BaseModel):
    class Config:
        arbitrary_types_allowed = True

    answer: typing.Optional[str] = ""
    prompt: typing.Optional[str] = ""
    source: list[dict] = []
    full: list[dict] = []
    answer_or_iterator: typing.Union[str, typing.Iterator, None] = None
    trace_id: str = None
    question_compliance: typing.Optional[bool] = None
    answer_compliance: typing.Optional[bool] = None
    durations: dict = {}


class RetrieveType(Enum):
    FIXED_TABLE = "fixed_table"
    NORMAL_TABLE = "structure"
    PARAGRAPH = "paragraph"


class QuestionAnalysisResult(BaseModel):
    """
    问题分析结果
    """
    # 是否是比较性问题【多问题的话】
    is_comparative_question: bool = False
    companies: list[str] = []
    extract_companies: list[str] = []
    years: list[str] = []
    rewrite_question: str = ""
    retrieve_question: str = ""
    keywords: list[str] = []


class RetrieveContext(BaseModel):
    """
    召回上下文
    """
    # 召回类型
    retrieval_type: RetrieveType = None
    # 召回来源
    origin: typing.Union[DocTableModel, DocFragmentModel] = None

    # 包含子树的ori_id列表
    tree_ori_ids: list[str] = []
    # tree节点的所有文本
    tree_text: str = ""
    # tree节点的所有文本列表
    tree_all_texts: list[str] = []

    # 相关的子召回列表
    related: list[typing.Union[DocTableModel, DocFragmentModel]] = []

    # 召回排序分数
    retrieve_rank_score: float = None
    # 问题粗排分数
    question_rerank_score: float = None
    # 召回重复repeat分数
    repeat_score: float = None

    # 问答前融合分数
    rerank_score_before_llm: float = None

    # 答案rerank分数
    answer_rerank_score: float = None
    # 送入大模型的text文本（有可能被token限制截断，为空时则取 get_text_str）

    @property
    def file_uuid(self):
        if isinstance(self.origin, DocTableModel):
            return self.origin.uuid

        elif isinstance(self.origin, DocFragmentModel):
            return self.origin.file_uuid

    @property
    def ori_ids(self):
        if self.tree_ori_ids:
            return self.tree_ori_ids

        if self.origin:
            return self.origin.ori_id

        return []

    @property
    def ans_rerank_texts(self):
        # 答案rerank用到的文本列表【总分总】
        if len(self.tree_all_texts) >= 2:
            return [self.tree_text] + self.tree_all_texts

        if self.tree_text:
            return [self.tree_text]

        if self.origin:
            return [self.origin.ebed_text]

        return []

    def __hash__(self):
        return hash(f"{self.file_uuid}|{self.ori_ids}")

    def intersect(self, other: "RetrieveContext") -> bool:
        """
        判断两个检索上下文是否重叠
        :param other:
        :return:
        """
        if self.file_uuid != other.file_uuid:
            return False

        if set(self.ori_ids).intersection(set(other.ori_ids)):
            return True

    def gen_full_return(self):
        """
        转换成接口的full接口数据 (临时)
        """
        return {
            "texts": self.tree_text,
            "text_list": self.ans_rerank_texts,
            "ori_id": self.ori_ids,
            "file_uuid": self.file_uuid,
            "infer": self.retrieval_type.value,
            "ori_texts": self.tree_text,
            "rank_score": self.answer_rerank_score or self.rerank_score_before_llm,
            # for test
            "companys": [],
            "years": [],
            "keyword": [],
            # "companys": self.companys,
            # "year": self.years,
            # "keyword": self.keywords,

        }


class Context(BaseModel):

    class Config:
        arbitrary_types_allowed = True

    params: Params
    # jaeger 追踪用的trace_id, 用作context的trace_id
    trace_id: str = None
    # 问题合规校验结果
    question_compliance: bool = None

    # 问题解析结果
    question_analysis: QuestionAnalysisResult = None
    company_mapper: dict[str, ESCompanyObject] = {}

    # 定位到的文件列表
    files: list[ESFileObject] = []
    locationfiles: list[ESFileObject] = []

    # 召回内容
    fixed_table_retrieve_small: list[DocTableModel] = []
    normal_table_retrieve_small: list[DocTableModel] = []
    fragment_retrieve_small: list[DocFragmentModel] = []

    # 原文Cache [文件uuid|文件ori_id, DocItemModel]
    doc_items_cache: dict[str, DocItemModel] = {}
    # 片段Cache [片段uuid, DocFragmentModel]
    fragment_cache: dict[str, DocFragmentModel] = {}

    # 问题 rerank之后结果
    rerank_retrieve_before_qa: list[RetrieveContext] = []

    # 问题 qa 结果
    llm_question: str = None
    llm_answer: str = None

    # 答案 rerank之后的结果
    rerank_retrieve_after_qa: list[RetrieveContext] = []

    # 答案合规
    answer_compliance: bool = None

    # 回答相关
    stream_iter: typing.Iterator = None

    # 耗时相关
    durations: dict = {}
    start_ts: float = 0

    # 返回回答的内容
    answer_response_iter: typing.Iterator = None
    answer_response: Response = None
