'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-06-20 20:06:00
LastEditors: longsion
LastEditTime: 2024-10-23 18:18:12
'''

from datetime import datetime
import re
from pkg.storage import Storage
from pkg.utils import compress, ensure_list, xjson
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from .objects import Context, FileOriEnum, FileTypeEnum
from pkg.utils.decorators import register_span_func
from pkg.es.es_company import ESCompanyObject, CompanyES
from pkg.es.es_file import ESFileObject, FileES
from pkg.openkie import ie_vllm
from pkg.config import config
from pkg.redis.redis import redis_store

FinancialFileTypes = [
    FileTypeEnum.ZhaoGuShuoMingShu,
    FileTypeEnum.NianBao,
    FileTypeEnum.BanNianBao,
    FileTypeEnum.Q1JiBao,
    FileTypeEnum.Q2JiBao,
    FileTypeEnum.Q3JiBao,
    FileTypeEnum.Q4JiBao,
    FileTypeEnum.YanBao,
]


@register_span_func(func_name="文档meta抽取", span_export_func=lambda context: context.model_dump(
    include=[
        "params",
        "trace_id",
        "file_meta",
    ])
)
def extract_file_meta(context: Context) -> Context:
    """
    文档meta信息抽取
    """

    context.file_meta.file_type = context.params.file_type
    if not context.file_meta.file_type:
        context.file_meta.file_type = extract_file_type(context)

    if context.params.ori_type != FileOriEnum.System.value and \
            (not context.params.company or not context.params.year):
        # 非系统知识库走抽取【系统知识库】
        # context.file_meta.extract_company_str, context.file_meta.year = extract_personal_document_meta(context)
        context.file_meta.extract_company_str, context.file_meta.year = "", ""

    if context.params.company:
        context.file_meta.company = query_es_company(context.params.company)
    if context.params.year:
        context.file_meta.year = context.params.year
    if context.params.filename:
        context.file_meta.filename = context.params.filename

    context.file_meta.filename = context.params.filename

    context.file_meta.upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    context.file_meta.knowledge_id = context.params.knowledge_id
    context.file_meta.ori_type = context.params.ori_type

    FileES().delete_by_file_uuid(context.params.uuid, wait_delete=True)

    context.es_file_entity = ESFileObject(
        uuid=context.params.uuid,
        ori_type=context.file_meta.ori_type,
        filename=context.params.filename,
        upload_time=context.file_meta.upload_time,
        kownledge_id=context.file_meta.knowledge_id,
        file_type=context.file_meta.file_type.value,
        file_title=context.file_meta.file_title,
        page_number=context.file_meta.page_number,
        first_image_id=context.file_meta.first_image_id,
        year=ensure_list(context.file_meta.year),
        company=context.file_meta.company.eid or context.file_meta.company.uuid if context.file_meta.company else "",
        extract_company_str=context.file_meta.extract_company_str,
        keywords=context.file_meta.keywords,
        summary=context.file_meta.summary,
        doc_fragments_json=xjson.dumps(gen_doc_fragments_json(context)),  # , ensure_ascii=False
        tree_summaries=context.file_meta.tree_summaries,
    )

    upload_doc_parse_thread = ThreadWithReturnValue(target=upload_doc_fragments_json, args=(context.es_file_entity.doc_fragments_json, context.params.uuid))
    upload_doc_parse_thread.start()
    context.threads.append(upload_doc_parse_thread)

    return context


def upload_doc_fragments_json(doc_fragments_json: str, uuid: str):
    stream = compress(doc_fragments_json)
    redis_store.set(f"fragment-{uuid}", stream)
    Storage.upload(f"fragments-{uuid}.gz", stream)


def extract_file_type(context: Context) -> FileTypeEnum:

    # 简单实现
    # TODO: 可以替换为模型
    # 前2页内容
    content = context.params.filename
    content += "*--------*".join([item.content for item in context.doc_ori_items if item.ori_id and (item.ori_id[0].startswith("1,") or item.ori_id[0].startswith("2,"))])

    for weighted, enum_type in (
        (zhaogushuomingshu_first_3_page_keywords_weighted, FileTypeEnum.ZhaoGuShuoMingShu),
        (nianbao_first_3_page_keywords_weighted, FileTypeEnum.NianBao),
        (bannianbao_first_3_page_keywords_weighted, FileTypeEnum.BanNianBao),
        (q1_jb_first_3_page_keywords_weighted, FileTypeEnum.Q1JiBao),
        (q3_jb_first_3_page_keywords_weighted, FileTypeEnum.Q3JiBao),
        (q2_jb_first_3_page_keywords_weighted, FileTypeEnum.Q2JiBao),
        (q4_jb_first_3_page_keywords_weighted, FileTypeEnum.Q4JiBao)
    ):
        score = sum(content.count(keyword) * score for keyword, score in weighted.items()) / len(weighted)
        if score > 0.6:
            return enum_type

    return FileTypeEnum.Normal


def extract_personal_document_meta(context: Context) -> tuple[str, str]:
    '''
    description:
    return {*} company_str, year
    '''
    content = ""
    content += "*--------*".join([item.content for item in context.doc_ori_items if item.ori_id and (item.ori_id[0].startswith("1,") or item.ori_id[0].startswith("2,"))])

    # 限制输入token，不走RAG
    content = content[:1000]
    single = ["公司名称", "年份", "文件标题"]
    extract_info = ie_vllm(text=content, single=single, ie_url=config["infer"]["openkie_url"])
    ie_company = extract_info.get("公司名称", "")
    ie_year = extract_info.get("年份", "")
    _ = extract_info.get("文件标题", "")
    year = ""
    match = re.search(r"\d{4}", ie_year)
    if not match:
        match = re.search(r"\d{4}年", content)
    if match:
        year = match.group().replace("年", "")  # 提取数字并移除“年”字
    if context.file_meta.file_type != "通用文档" and ie_company != "":
        company = query_es_company(ie_company)
    else:
        company = ie_company

    return company, year


def gen_doc_fragments_json(context: Context):

    return [
        fragment.model_dump(exclude=[
            "ebed_text"
        ])
        for fragment in context.doc_fragments
    ]


def query_es_company(company_name: str) -> ESCompanyObject:
    es_companys = CompanyES().search_company(company_name, size=1)
    if es_companys:
        return es_companys[0]
    return None


zhaogushuomingshu_first_3_page_keywords_weighted = {
    "招股说明书": 0.9,
    "上市公告书": 0.9,
    "股票发行": 0.8,
    "首次公开": 0.8,
    "股票类型": 0.8,
    "发行日期": 0.8,
    "发行价格": 0.8,
}

nianbao_first_3_page_keywords_weighted = {
    "年报": 0.9,
    "年度报告": 0.9
}

bannianbao_first_3_page_keywords_weighted = {
    "半年报": 0.9,
    "半年度报告": 0.9
}


q1_jb_first_3_page_keywords_weighted = {
    "第一季度报告": 0.9,
    "一季报": 0.9
}

q2_jb_first_3_page_keywords_weighted = {
    "第二季度报告": 0.9,
    "二季报": 0.9
}

q3_jb_first_3_page_keywords_weighted = {
    "第三季度报告": 0.9,
    "三季报": 0.9
}

q4_jb_first_3_page_keywords_weighted = {
    "第四季度报告": 0.9,
    "四季报": 0.9
}
