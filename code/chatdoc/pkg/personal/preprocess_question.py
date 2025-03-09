'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-27 15:23:01
LastEditors: longsion
LastEditTime: 2024-10-23 14:19:48
'''
import os.path
from pkg.personal.objects import Context, QuestionAnalysisResult
from pkg.es.es_p_file import PESFileObject, PFileES
from pkg.es.es_company import CompanyES
from pkg.query_analysis import query_extract_uie
from pkg.storage import Storage
from pkg.utils import compress, decompress, ensure_list, has_intersection_list
from pkg.utils.decorators import register_span_func
from pkg.utils.jaeger import TracedThreadPoolExecutor
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.config import config
from difflib import get_close_matches, SequenceMatcher
from pkg.redis.redis import redis_store

from datetime import datetime
import re


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


@register_span_func(func_name="预处理问题&问题路由", span_export_func=func_span)
def preprocess_question(context: Context) -> Context:
    ori_question = context.params.question
    # question 校验
    question = replace_query(ori_question)
    if question:
        _extract_info_t = ThreadWithReturnValue(target=get_extract_info, args=(question,))
        _extract_info_t.start()

        all_files = get_personal_files_by_uuid(context.params.user_id, context.params.document_uuids)
        extract_info = _extract_info_t.join()
    else:
        all_files = []
        extract_info = {}

    regular_question_years = year_regular(question, extract_info["years"])  # query中的时间信息进行拆解
    question_location_companies = file_match(question=question, file_metas=all_files, question_years=extract_info["years"], regular_question_years=regular_question_years, question_companys=extract_info["companys"])  # query匹配file_name、company_name、file_title后的最优解

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

    # extract commpany mapper
    company_entities = CompanyES().search_company_by_eids_or_uids(list(set([_file.company for _file in all_files if _file.company])))
    context.company_mapper.update({
        company.eid: company for company in company_entities
    })
    context.company_mapper.update(
        {
            company.uuid: company for company in company_entities
        }
    )

    if context.params.document_uuids:
        # 指定uuid列表进行问答
        context.locationfiles = file_location(context.question_analysis.companies, all_files, context.company_mapper)
        # TODO: 通过年份过滤文件【问题中的年份在文件中年份之后，需要过滤】
        if regular_question_years:
            context.locationfiles = [file for file in context.locationfiles if has_intersection_list(file.year, regular_question_years) or file.year == [""] or file.kownledge_id != "0"]
        # 如果没有找到相应公司的文件，则使用全文件库去搜索
        if not context.locationfiles:
            context.locationfiles = all_files
        context.files = all_files
    else:
        # 全库问答
        # TODO: 待优化
        context.files = []
        company_entities = company_regular(question, context.question_analysis.extract_companies)

        for company in company_entities:
            company_files = PFileES().search_by_company(company.eid or company.uuid, size=1)
            context.files.extend(company_files)

    context.files = {file.uuid: file for file in context.files}.values()  # 去重

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


def file_match(question, file_metas: list[PESFileObject], question_years, regular_question_years, question_companys) -> list[str]:
    """
    1、获取选定文档的document_uuids
    2、根据file_meta获取file_name、company_name、year、file_title等信息
    3、根据query定位问题所在的文件
    """
    # 先将源问题中的年份信息进行补充
    if not regular_question_years or not question_years:
        question = question
    else:
        if len(question_years) > 1:
            for year in question_years[1:]:
                question = re.sub(fr"({year})", "", question.replace("年", ""))
        question = re.sub(fr"({question_years[0]})", ",".join(regular_question_years), question.replace("年", ""))

    file_full_names = [file_meta.filename for file_meta in file_metas]
    file_names = [os.path.splitext(filename)[0] for filename in file_full_names]
    company_eids = list(set([file_meta.company for file_meta in file_metas if file_meta.company]))
    extract_company_names = [file_meta.extract_company_str for file_meta in file_metas]

    if company_eids:
        extract_company_names.extend(
            [
                company.name for company in CompanyES().search_company_by_eids_or_uids(company_eids)
            ]
        )

    file_titles = [file_meta.file_title for file_meta in file_metas]

    matches = list(set(file_names + extract_company_names + file_titles + ['']))
    new_file_matches = []
    if len(question_companys) == 1:
        new_file_matches = list(filter(None, [file_match for file_match in list(set(matches)) if
                                              question_companys[0] in file_match or file_match in question_companys[0]]))
    if not new_file_matches:
        file_matches = []
        if regular_question_years:
            _extract_infos = [company + year for company in question_companys for year in regular_question_years]
        else:
            _extract_infos = question_companys
        # 构建线程列表
        threads = []
        for _extract_info in _extract_infos:
            t = ThreadWithReturnValue(target=search_engine, args=(_extract_info, matches, 0.4, ))
            t.start()
            threads.append(t)
        results = [t.join() for t in threads]
        for result in results:
            file_matches.extend(result)

        if file_matches == []:
            file_matches = search_engine(question, matches, score=0.3)

        if len(question_companys) == 1:
            new_file_matches = [file_match for file_match in list(set(file_matches)) if question_companys[0] in file_match or file_match in question_companys[0]]
        if not new_file_matches:
            new_file_matches = list(set(file_matches))
    return new_file_matches

    # # file_location by rerank_model
    # concurrent_split_txts = split_list(matches, chunk_size=16)
    # pairs = [[[question], concurrent_split_txt] for concurrent_split_txt in concurrent_split_txts]
    # tasks_with_index = [
    #     (i, txt2) for i, txt2 in enumerate(pairs)
    # ]
    # with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    #     futures = {executor.submit(rerank_api_by_cache, txt2, headers=None, url=config["textin"]["rerank_url"],
    #                                if_softmax=0): idx for idx, txt2 in tasks_with_index}
    #
    #     # 使用OrderedDict来保证按原顺序收集结果
    #     ordered_results = OrderedDict()
    #     for future in concurrent.futures.as_completed(futures):
    #         idx = futures[future]
    #         result = future.result()
    #         ordered_results[idx] = result
    #
    #     # 提取并排序结果
    #     ress = [ordered_results[i] for i in range(len(ordered_results))]
    # scores = [score for text_span_score in ress for score in text_span_score]
    # scores = [round(score, 4) for score in softmax(scores)]
    #
    # score_res = dict(zip(matches, scores))
    # matched_file = {k: v for k, v in sorted(score_res.items(), key=lambda x: x[1], reverse=True)}
    # filter_file_match = {}
    # for k, v in matched_file.items():
    #     if k == '':
    #         break
    #     filter_file_match[k] = v
    # filter_file_match = {k: v for k, v in filter_file_match.items() if v > 0.2}
    # return list(filter_file_match.keys())


def file_location(companys: list[str], file_metas: list[PESFileObject], company_mapper: dict):

    location_files = [file_meta
                      for file_meta in file_metas
                      for _filter in companys if
                      any([
                          _filter in file_meta.filename,
                          _filter in company_mapper[file_meta.company].name if file_meta.company and file_meta.company in company_mapper else _filter in file_meta.extract_company_str,
                          _filter in file_meta.file_title
                      ])]

    location_files = [
        next(file for file in location_files if file.filename == key)
        for key in {file.filename for file in location_files}
    ]
    return location_files


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


def get_personal_files_by_uuid(user_id, uuids, with_doc_fragments_json=True):
    all_files = PFileES().get_by_file_uuids(user_id, uuids, with_doc_fragments_json=False)

    if with_doc_fragments_json:
        attach_p_file_fragments_json(user_id, all_files)

    return all_files


def attach_p_file_fragments_json(user_id: str, files: list[PESFileObject]):
    uuids = [file.uuid for file in files]
    cache_keys = [f"fragment-{user_id}-{u}" for u in uuids]
    cached_results = redis_store.mget(cache_keys)

    uncached_files = []
    for i, _file in enumerate(files):
        if cached_results[i]:
            _file.doc_fragments_json = decompress(cached_results[i])

        else:
            uncached_files.append(_file)

    def _attach_p_file_fragments_json(_file):
        fragment_gz, err = Storage.download_content(f"User_{user_id}/fragments-{_file.uuid}.gz")
        if err:
            fragment_json = PFileES().search_file_fragment_json(user_id, _file.uuid)
            _file.doc_fragments_json = fragment_json
            if fragment_json:
                Storage.upload(f"User_{user_id}/fragments-{_file.uuid}.gz", compress(fragment_json))
                redis_store.set(f"fragment-{user_id}-{_file.uuid}", compress(fragment_json), ex=86400 * 30)  # 缓存过期时间为 30天
        else:
            _file.doc_fragments_json = decompress(fragment_gz)
            redis_store.set(f"fragment-{user_id}-{_file.uuid}", fragment_gz, ex=86400 * 30)  # 缓存过期时间为 30天

    with TracedThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(_attach_p_file_fragments_json, _file) for _file in uncached_files]
        for _ in futures:
            pass
