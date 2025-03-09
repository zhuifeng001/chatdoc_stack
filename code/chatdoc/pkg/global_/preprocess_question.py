'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-27 15:23:01
LastEditors: longsion
LastEditTime: 2024-10-08 16:50:58
'''
import os.path

from pkg.es.es_p_file import PFileES
from pkg.global_.objects import Context, GlobalQAType, QuestionAnalysisResult
from pkg.es.es_file import FileES
from pkg.es.es_company import CompanyES
from pkg.query_analysis import query_extract_uie
from pkg.utils import ensure_list
from pkg.utils.decorators import register_span_func
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.config import config
from difflib import get_close_matches, SequenceMatcher

from datetime import datetime
import re


retrieve_years = [str(datetime.now().year - 2), str(datetime.now().year - 1), str(datetime.now().year)]
filter_words = ["信息", "科技", "有限", "公司", "股份", "电气", "电器", "保险", "控股", "集团", "制药", "智能", "证券", "有限公司", "科技股份", "网络", "网络科技", "数据", "报告", "年报", "季报", "一季报", "半年报", "三季报", "年度报告", "招股书", "pdf"]


def func_span(context: Context):
    return dict(
        params=context.params.model_dump(),
        analysis_result=context.question_analysis.model_dump(),
        files=[
            file.model_dump(exclude=["doc_fragments_json"]) for file in context.files
        ],
    )


keyword_dict = {
    "Q1": "一季度",
    "Q2": "二季度",
    "Q3": "三季度",
    "Q4": "四季度",
    "A/R": "应收账款",
    "AR": "应收账款",
    "AP": "应付账款",
    "A/P": "应付账款",
    "三费": "销售费用、管理费用、财务费用",
    "ROA": "总资产收益率",
    "ROE": "净资产收益率",
    "EBITDA": "息税折旧及摊销前利润",
    "EBIT": "息税前利润",
    "EPS": "基本每股收益",
    "同比": "同比",
    "环比": "环比"
}


def replace_query(query: str) -> str:
    '''关键词映射替换'''
    for key, value in keyword_dict.items():
        query = re.sub(key, value, query)
    return query


def gen_query(query, words):
    for word in words:
        query = query.replace(word, "")
    return query


def search_both_file_brief(user_id: str, question: str):
    analyst_brief_files = FileES().search_file_brief_by_query(question)
    personal_brief_files = PFileES().search_file_brief_by_query(user_id, question)

    return analyst_brief_files + personal_brief_files


@register_span_func(func_name="预处理问题&问题路由", span_export_func=func_span)
def preprocess_question(context: Context) -> Context:
    ori_question = context.params.question
    # question 校验
    question = replace_query(ori_question)
    if question:
        if context.params.qa_type == GlobalQAType.ANALYST.value:
            _files_brief_t = ThreadWithReturnValue(target=FileES().search_file_brief_by_query, args=(gen_query(replace_query(context.params.question), filter_words),))

        elif context.params.qa_type == GlobalQAType.PERSONAL.value:
            _files_brief_t = ThreadWithReturnValue(target=PFileES().search_file_brief_by_query, args=(context.params.user_id, gen_query(replace_query(context.params.question), filter_words),))

        else:
            _files_brief_t = ThreadWithReturnValue(target=search_both_file_brief, args=(context.params.user_id, gen_query(replace_query(context.params.question), filter_words),))

        _files_brief_t.start()

        _extract_info_t = ThreadWithReturnValue(target=get_extract_info, args=(question,))
        _extract_info_t.start()

        files_brief = _files_brief_t.join()
        extract_info = _extract_info_t.join()
    else:
        files_brief = []
        extract_info = {}

    match_names = []
    # extract commpany mapper
    if files_brief:
        company_entities = CompanyES().search_company_by_eids_or_uids(list(set([_file.company for _file in files_brief if _file.company])))
        context.company_mapper.update({
            company.eid: company for company in company_entities
        })
        context.company_mapper.update(
            {
                company.uuid: company for company in company_entities
            }
        )
        file_full_names = [file_meta.filename for file_meta in files_brief if file_meta.filename]
        file_names = [os.path.splitext(filename)[0] for filename in file_full_names]
        extract_company_names = [file_meta.extract_company_str for file_meta in files_brief if file_meta.extract_company_str]
        file_company_names = [company_entity.name for company_entity in company_entities]
        match_names = file_names + extract_company_names + file_company_names

    regular_question_years = year_regular(question, extract_info["years"])  # query中的时间信息进行拆解
    question_location_companies = file_match(question=question, match_names=match_names, question_years=extract_info["years"], regular_question_years=regular_question_years, question_companys=extract_info["companys"])  # query匹配file_name、company_name、file_title后的最优解

    analysis_result = QuestionAnalysisResult(
        is_comparative_question=is_comparative_question(question),
        years=regular_question_years,
        extract_companies=ensure_list(extract_info["companys"]),  # query解析的结果，有可能会出错
        companies=question_location_companies,  # query匹配file_name、company_name、file_title后的最优解
        keywords=extract_info["key_words"],
        rewrite_question=question,  # TODO: 待改写
        retrieve_question=gen_retrieve_quetsion(question, ensure_list(extract_info["companys"]), question_location_companies),
    )
    context.question_analysis = analysis_result

    # 全库问答
    context.files = []
    context.locationfiles = file_location(context.question_analysis.companies, files_brief, context.company_mapper)
    context = file_filter(context)

    return context


def is_comparative_question(question):
    # 示例文本
    """
    这两家公司的报告，
    这几个公司的产品，
    这几份文件需要审核，
    这些文件非常重要，
    这些公司参加了会议，
    这几家公司有合作意向。
    """
    pattern = re.compile(r'这(?:(几|些)个)?\s*(公司|文件|家|份|其他可能的名词)+')
    # 使用正则表达式查找匹配项
    matches = pattern.findall(question)

    # 打印匹配到的短语
    for _ in matches:
        return True

    return False


def year_regular(question, extract_years):
    """
    将问题中的时间描述词汇转换为具体的年份或年份范围。将抽取出的年份信息转换为具体的年份

    : param question: 用户问题
    : param extract_years: 提取的年份信息。
    : return: 各时间描述对应的年份或年份范围。
    """
    # rule_extract_years
    pattern = r'\d{4}|\d{2}年'
    res = re.findall(pattern, question)
    res = list(set([r.replace("年", "") for r in res]))
    for r in res:
        if len(r) == 2:
            res.remove(r)
            res.extend([str(2000 + int(r))])

    # 文字表示的时间信息
    query_periods = []
    current_year = datetime.now().year
    for k, years in convert_time_periods_to_years(current_year).items():
        if k in question:
            query_periods = [str(y) for y in years]

    if extract_years:
        for extract_year in extract_years:
            years = re.findall(pattern, extract_year)
            if years:
                if "-" in extract_year or "至" in extract_year or "到" in extract_year:
                    if len(min(years)) == len(max(years)) and len(min(years)) == 4:
                        years = list(range(int(min(years)), int(max(years)) + 1))
                        res.extend([str(y) for y in years])
                    else:
                        years = [y[-2:] for y in years]
                        years = list(range(2000 + int(min(years)), 2000 + int(max(years)) + 1))
                        res.extend([str(y) for y in years])
            elif len(extract_year) == 2:
                res.extend([str(2000 + int(extract_year))])
            else:
                res.extend(years)
        if res:
            for r in res.copy():
                for k, years in convert_time_periods_to_years(int(r)).items():
                    if k in question:
                        periods = [str(y) for y in years]
                        res.extend(periods)
    final_years = res + query_periods
    return list(set([r for r in final_years if len(r) == 4 and r < str(2100)]))


def convert_time_periods_to_years(current_year):
    """
    将时间描述词汇转换为具体的年份或年份范围。

    : param current_year: 当前年份，整数。
    : return: 各时间描述对应的年份或年份范围。
    """
    this_year = current_year
    next_year = current_year + 1
    after_next_year = current_year + 2
    past_years_default = 5  # 默认过去五年的定义

    periods = {
        "未来一年": [next_year],
        "未来两年": list(range(next_year, next_year + 2)),
        "未来三年": list(range(next_year, next_year + 3)),
        "未来四年": list(range(next_year, next_year + 4)),
        "未来五年": list(range(next_year, next_year + 5)),
        "过去几年": list(range(this_year - past_years_default, this_year)),
        "这几年": list(range(this_year - 4, this_year + 1)),  # 假设这几年指的是最近的三年
        "这两年": list(range(this_year - 4, this_year)),
        "近几年": list(range(this_year - 4, this_year + 1)),
        "近些年": list(range(this_year - 4, this_year + 1)),
        "近年": list(range(this_year - 4, this_year + 1)),
        "近两年": list(range(this_year - 4, this_year)),
        "近三年": list(range(this_year - 4, this_year + 1)),
        "前三年": list(range(this_year - 3, this_year)),
        "前两年": list(range(this_year - 2, this_year)),
        "今年": [this_year],
        "明年": [next_year],
        "后年": [after_next_year],
        "去年": [this_year - 1],
        "前年": [this_year - 2]
    }

    return periods


def file_match(question, match_names: list, question_years, regular_question_years, question_companys) -> list[str]:
    """
    1、获取选定文档的document_uuids
    2、根据file_meta获取file_name、company_name、year、file_title等信息
    3、根据query定位问题所在的文件
    """
    # 先将源问题中的年份信息进行补充
    if not regular_question_years:
        question = question
    else:
        if len(question_years) > 1:
            for year in question_years[1:]:
                question = re.sub(fr"({year})", "", question.replace("年", ""))
            question = re.sub(fr"({question_years[0]})", ",".join(regular_question_years), question.replace("年", ""))

        for k, years in convert_time_periods_to_years(2024).items():
            if k in question:
                question = question.replace(k, ",".join(regular_question_years))

    matches = list(set(match_names + ['']))
    new_file_matches = []
    if len(question_companys) == 1:
        new_file_matches = list(filter(None, [file_match for file_match in list(set(matches)) if
                                              question_companys[0] in file_match or file_match in question_companys[0]]))
    if not new_file_matches:
        file_matches = []
        if regular_question_years:
            _extract_infos = [year + company for company in question_companys for year in regular_question_years]
        else:
            _extract_infos = question_companys
        for _extract_info in _extract_infos:
            result = search_engine(_extract_info, matches, 0.3)
            file_matches.extend(result)

        if file_matches == []:
            file_matches = search_engine(gen_query(question, filter_words), matches, score=0.3)

        if len(question_companys) == 1:
            new_file_matches = [file_match for file_match in list(set(file_matches)) if question_companys[0] in file_match or file_match in question_companys[0]]
        if not new_file_matches:
            new_file_matches = list(set(file_matches))
    return new_file_matches


def file_location(companys: list[str], files_brief: list, company_mapper: dict):

    location_files = [file_meta
                      for file_meta in files_brief
                      for _filter in companys if
                      any([
                          _filter in (os.path.splitext(file_meta.filename)[0] or ""),
                          _filter in (file_meta.extract_company_str or ""),
                          file_meta.company and file_meta.company in company_mapper and _filter in company_mapper[file_meta.company].name
                      ])]

    location_files = [
        next(file for file in location_files if file.filename == key)
        for key in {file.filename for file in location_files}
    ]
    return location_files


def file_filter(context):
    """
    过滤条件：
    1、对于指定公司主体的搜索，过滤与公司主体无关的文件
    2、对于相对模糊的搜索，query中未提及时间信息的，建议查询3年内的结果
    3、研报>年报>招股书>半年报>季报
    """
    # file_type = ["半年报", "招股说明书", "年报", "季报", "研报"]
    # match_types = get_close_matches(context.params.question, file_type, cutoff=0.2)
    # if "季报" in match_types:
    #     match_types.extend(["Q1季报", "Q2季报", "Q3季报", "Q4季报"])

    match_years = context.question_analysis.years
    if not match_years:
        match_years = retrieve_years
    if context.files:
        temp_files = []
        for file in context.files:
            if min(file.year) >= min(match_years) or file.year == ['']:
                temp_files.append(file)
        if temp_files:
            context.files = temp_files
        else:
            return context
        return context
    if context.locationfiles:
        temp_files = []
        for file in context.locationfiles:
            if min(file.year) >= min(match_years) or file.year == ['']:
                temp_files.append(file)
        if temp_files:
            context.locationfiles = temp_files
        else:
            return context
    return context


def gen_retrieve_quetsion(question, companies, document_companys):
    """
    文本（问题、答案）中的公司名替换为“该公司”
    满足单文档问答场景下，问题中有公司，文档有公司，且两者是一个公司，包含公司全称和简称的校验
    Args:
        question: 原始问题
        companies: 问题中的公司名
        document_companies: 文档中的公司名(与query匹配过的file_name, company_name, file_title)
    Returns:
    """
    # 筛选query抽取的公司名，排除抽取错误的情况
    regular_companies = []
    if not document_companys:
        return question
    for company in companies:
        if max([calculate_similarity(company, document_company) for document_company in document_companys]) > 0.15:  # todo 没有语义上的匹配
            regular_companies.append(company)

    for ind, company in enumerate(regular_companies):
        if ind == 0:
            question = re.sub(fr"({company})", "该公司", question)
        else:
            question = re.sub(fr"({company})", "", question)

    return question


def calculate_similarity(str1, str2):
    """
    计算两个字符串的相似度
    :param str1: 第一个字符串
    :param str2: 第二个字符串
    :return: 相似度，范围在0到1之间
    """
    # 创建SequenceMatcher对象
    seq_matcher = SequenceMatcher(None, str1, str2)

    # 计算两个字符串的相似度比例
    similarity = seq_matcher.ratio()

    return similarity


def search_engine(query, data_list, score):
    matches = get_close_matches(query, data_list, cutoff=score)
    return matches


def company_regular(question, companys):
    regular_companys = [
        regular_company
        for company in companys
        for regular_company in CompanyES().search_company(company, size=1)
    ]

    if not regular_companys:
        regular_companys = CompanyES().search_company(question, size=1)

    regular_companys = list({obj.uuid: obj for obj in regular_companys}.values())

    return regular_companys


def get_extract_info(question):
    return query_extract_uie(config["infer"]["question_keyword_url"], question)
