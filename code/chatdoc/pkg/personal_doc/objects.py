'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-14 11:32:10
LastEditors: longsion
LastEditTime: 2024-10-17 15:10:46
'''

from typing import Optional, Union
from pydantic import BaseModel
from pkg.es.es_company import ESCompanyObject
from pkg.es.es_p_file import PESFileObject
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from enum import Enum, IntEnum
from opentelemetry import context as otel_context


class FileTypeEnum(Enum):
    ZhaoGuShuoMingShu = "招股说明书"
    NianBao = "年报"
    BanNianBao = "半年报"
    Q1JiBao = "Q1季报"
    Q2JiBao = "Q2季报"
    Q3JiBao = "Q3季报"
    Q4JiBao = "Q4季报"
    YanBao = "研报"
    Normal = "通用文档"


class FileOriEnum(Enum):
    System = "系统知识库"
    Personal = "个人知识库"


class FileProcessException(Exception):

    def __init__(self, message: str, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.message = message


class DeleteParams(BaseModel):
    # 用户 id
    user_id: str
    # 文件 uuid
    uuids: list[str]


class Params(BaseModel):

    # 用户 id
    user_id: str
    # 文件 uuid
    uuid: str
    # 文件名称
    filename: str
    # knowledge_id: 知识库id
    knowledge_id: str = "0"
    # ori_type
    ori_type: str = FileOriEnum.System.value
    # 回调接口
    callback_url: str = None

    # 公司
    company: str = None
    # 年份
    year: str = None
    # 行业
    # industry: str = None
    # 文件类型
    file_type: FileTypeEnum = FileTypeEnum.Normal

    # force_doc_parse:
    force_doc_parse: bool = False


class FileMeta(BaseModel):

    # 上传及参数中获得的属性
    upload_time: str = None
    knowledge_id: str = ""
    ori_type: str = FileOriEnum.System.value

    # 财务相关文件，预处理中获得的属性
    filename: str = ""
    file_type: FileTypeEnum = FileTypeEnum.Normal
    company: ESCompanyObject = None
    extract_company_str: str = ""
    year: str = ""
    file_title: str = ""

    page_number: int = 0
    # 保存第一页image_id，目前node层用
    first_image_id : str = ""

    # LLM处理中获得的属性
    keywords: list[str] = []
    summary: str = ""
    tree_summaries: list[str] = []


class Response(BaseModel):
    class Config:
        arbitrary_types_allowed = True

    trace_id: str = None
    status: str = ""  # processing | exists
    file_meta: Optional[dict] = None

# ------ 文档解析结构 【暂时不用】------


class PageContent(BaseModel):
    type: str = ""  # line | ...
    id: int = 0     # 段落编号 从1开始
    pos: list[int] = []  # 段落在文件中的起始位置
    text: str = ""  # 段落文本
    char_pos: list[list[int]] = []  # 字符列表坐标


class BasePageStructure(BaseModel):
    type: str = ""  # textblock | table
    id: int = 0
    content: list = []


class TableCells(BaseModel):
    row: int = 0
    row_span: int = 1
    col: int = 0
    col_span: int = 1
    pos: list[int] = []
    content: list[BasePageStructure] = []


class PageTableStructure(BasePageStructure):

    type: str = "table"
    sub_type: int = 0
    parse_type: list[int] = []
    rows: str = ""
    cols: list[int] = []
    pos: list[int] = []
    columns_width: list[float] = []
    rows_height: list[float] = []
    cells: list[TableCells] = []


class PageFooterStructure(BasePageStructure):
    type: str = "footer"
    pos: list[int] = []
    content: list[BasePageStructure] = []


class PageImageProperty(BaseModel):
    url: str = ""


class DocParsePage(BaseModel):
    num: int = 0
    width: int = 0
    height: int = 0
    dpi: int = 0
    process_type: int = 1
    content: list[PageContent] = []
    structured: list[BasePageStructure] = []
    image: PageImageProperty = None


class DocParseResult(BaseModel):
    type: str = ""
    src_page_count: int = 0
    pages: list[DocParsePage] = []


# ------ 文档树解析 -------

class DocTreeNode(BaseModel):
    label: str = ""  # Text|Heading|Table
    pos: list[int] = []
    ori_id: list[str] = []
    content: list[str] = []
    children: list["DocTreeNode"] = []
    tree_level: int = 0  # 节点所在树的深度，ROOT节点为-1，以下从0开始
    page_id: int = 0  # 页码，从1开始


class DocTreeGenerateNode(BaseModel):
    content: str = ""
    pageNum: int = -1
    pos: list[int] = []
    level: int = -1


class DocTree(BaseModel):

    tree: list[DocTreeNode] = []
    generate: list[DocTreeGenerateNode] = []


# -------------

class DocOriItemType(Enum):
    PARAGRAPH = "paragraph"
    TABLE = "table"


class DocOriItem(BaseModel):
    titles: list[str] = []
    ori_id: list[str] = []
    content: Union[str, list] = ""  # 段落内容 | 表格markdown内容
    content_html: Union[str, list] = ""  # 段落内容 | 表格html内容
    type: DocOriItemType = DocOriItemType.PARAGRAPH

# -------------


class DocTableType(Enum):
    THREE_TABLE = "three_table"
    NORMAL_TABLE = "normal_table"


class DocTableRowItem(BaseModel):
    title: str = ""
    ori_id: list[str] = []
    type: DocTableType = DocTableType.NORMAL_TABLE
    row_id: int = -1
    keywords: list[str] = []
    row_ebed_str: str = ""


# -------------

class Fragment(BaseModel):
    uuid: str = ""                  # 切片唯一标识uuid
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


# -------------


# class ZhaoGuShuoMingShuMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.ZhaoGuShuoMingShu
#     company: ESCompanyObject = None
#     year: int


# class NianBaoMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.NianBao
#     year: int


# class BanNianBaoMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.BanNianBao
#     year: int


# class Q1JiBaoMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.Q1JiBao
#     year: int


# class Q2JiBaoMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.Q2JiBao
#     year: int


# class Q3JiBaoMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.Q3JiBao
#     year: int


# class Q4JiBaoMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.Q4JiBao
#     year: int


# class YanBaoMeta(FileMeta):
#     file_type: FileTypeEnum = FileTypeEnum.YanBao
#     year: int


# -------------

class FileProcessStatus(IntEnum):
    file_upload_success = 1
    file_doc_parse_success = 2
    file_catalog_success = 3
    file_cut_success = 4
    file_summary_success = 5
    file_process_error = -1


class Context(BaseModel):

    class Config:
        arbitrary_types_allowed = True

    params: Params
    # jaeger 追踪用的trace_id, 用作context的trace_id
    trace_id: str = None
    span_ctx: otel_context.Context = None

    # org_file_path
    org_file_path: str = None

    # doc_parse_path
    doc_parse_path: str = None
    # doc_parse_result: 文档解析的json结果
    doc_parse_result: dict = None
    # page_base64_imgs 文档解析的图片base64数据
    page_base64_imgs: list = []

    # threads: 异步处理任务
    threads: list[ThreadWithReturnValue] = []

    # catalog_path
    catalog_path_frontend: str = None
    catalog_path: str = None

    # doc_tree: 目录解析结果
    doc_tree: DocTree = None
    # ori_items: 目录解析结果
    doc_ori_items: list[DocOriItem] = []

    # doc_table_row_items: 表格解析行数据信息
    doc_table_row_items: list[DocTableRowItem] = []

    # doc_fragments: 文档段落切片
    doc_fragments: list[Fragment] = []

    # file_meta: 文档关键数据
    file_meta: FileMeta = FileMeta()
    # es_file_entity: 文档es实体，解析流程全部完成之后再插入file表
    es_file_entity: PESFileObject = None

    # document_summary: 文档总结
    document_summary: str = None
    # document_tree_summaries: 文档一级目录总结内容
    document_tree_summaries: list[str] = []

    # document_keywords 文档抽取到的关键词
    document_keywords: list[str] = []

    # 返回回答的内容
    answer_response: Response = None


class VectorEntity(BaseModel):
    uuid: str
    file_uuid: str
    vector: list[float]
