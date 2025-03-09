

from collections import Counter
from datetime import datetime
from functools import cache
import re
import requests
from difflib import get_close_matches

from app.config import config
from app.services.es import ESFileObject, global_es
from app.utils.logger import log_msg
from app.utils.thread_with_return_value import ThreadWithReturnValue
from app.utils.utils import ensure_list, retry_exponential_backoff

FR_KEYWORDS = dict(
    HALF_YEAR=['半年报', '半年度报告'],
    YEAR=['年报', '年度报告'],
    Q1=[
        'q1',
        'Q1',
        '1季报',
        '一季报',
        '第1季报',
        '第一季报',
        '1季度报告',
        '一季度报告',
        '第1季度报告',
        '第一季度报告',
    ],
    Q3=[
        'q3',
        'Q3',
        '3季报',
        '三季报',
        '第3季报',
        '第三季报',
        '3季度报告',
        '三季度报告',
        '第3季度报告',
        '第三季度报告',
    ],
    Q1_3=['季报', '季度报告'],
    ZHAOGUSHU=['招股书', '招股说明书']
)


filter_words = ["信息", "科技", "有限", "公司", "股份", "电气", "电器", "保险", "控股", "集团", "制药", "智能", "证券", "有限公司", "科技股份", "网络", "网络科技", "数据", "报告", "年报", "季报", "一季报", "半年报", "三季报", "年度报告", "招股书", "pdf"]


@cache
@log_msg
def analyst_query(query: str):
    if not query:
        return

    t = ThreadWithReturnValue(target=analyst_query_by_model, args=(query,))
    t.start()

    # 并行处理
    match_companies, alias_name_mapper = search_company_bm25(query)
    extract_years, extract_companys, extract_keywords = t.join()
    regular_extract_years = year_regular(query, extract_years)  # query中的时间信息进行拆解

    regular_question_companies = file_match(gen_sub_query(query, extract_years), match_companies, extract_companys)
    companies = [alias_name_mapper.get(cur) for cur in regular_question_companies if cur in alias_name_mapper]
    return {
        "years": regular_extract_years,
        "companies": list(set(companies)),
        "keywords": extract_keywords,
        "finance_types": get_finance_types(query)
    }


def get_finance_types(query) -> str:
    '''
    description: 获取财报的类型
    return {*}
    '''

    keyword_cnts = Counter()

    for _tp, words in FR_KEYWORDS.items():
        for word in words:
            if word in query:
                keyword_cnts[_tp.lower()] += query.count(word)
                break

    finance_tps = []

    for keyword in ["zhaogushu", "half_year", "q1", "q3"]:
        if keyword_cnts[keyword] > 0:
            finance_tps.append(keyword)

    if keyword_cnts["year"] > keyword_cnts["half_year"]:
        finance_tps.append("year")

    if keyword_cnts["q1_3"] > keyword_cnts["q1"] + keyword_cnts["q3"]:
        finance_tps.extend(["q1", "q3"])

    return list(set(finance_tps))


@retry_exponential_backoff()
def analyst_query_by_model(query):
    """
    调用UIE(https://arxiv.org/pdf/2203.12277.pdf)训练的信心抽取模型，抽取字段为'年份','日期','关键字'三个字段.
    Args:
        url: 模型部署的URL.
        query: 要抽取的问题.

    Returns: 抽取的三个字段的字典.

    """
    json_text = {
        "input": query
    }
    completion = requests.post(url=config['analyst']['query_analysis_url'],
                               headers={'Content-Type': 'application/json'},
                               json=json_text)
    completion.raise_for_status()
    res = completion.json()
    return res["years"], res["companys"], res["keywords"]


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
        "这两年": list(range(this_year - 1, this_year + 1)),
        "近几年": list(range(this_year - 4, this_year + 1)),
        "近些年": list(range(this_year - 4, this_year + 1)),
        "近年": list(range(this_year - 4, this_year + 1)),
        "近两年": list(range(this_year - 1, this_year + 1)),
        "近三年": list(range(this_year - 2, this_year + 1)),
        "前三年": list(range(this_year - 3, this_year)),
        "前两年": list(range(this_year - 2, this_year)),
        "今年": [this_year],
        "明年": [next_year],
        "后年": [after_next_year],
        "去年": [this_year - 1],
        "前年": [this_year - 2]
    }

    return periods


@retry_exponential_backoff()
def search_company_bm25(query):
    company_index_name = config['es']['index_company']
    source_fields = ["eid", "name", "alias"]
    hits = []
    condition_should = [
        dict(match=dict(alias=query))
    ]
    ret = global_es.search(company_index_name, {
        "_source": source_fields,
        # "min_score": 0,
        "query": {
            "bool": {
                "should": condition_should,
            }
        },
        "size": 500
    })
    hits = ret["hits"]["hits"]

    alias_name_mapper = dict()
    es_companies = []

    for hit in hits:
        for _alias in ensure_list(hit["_source"]["alias"]):
            alias_name_mapper[_alias] = hit["_source"]["name"]
            es_companies.append(_alias)

    if query in es_companies:
        return [query], alias_name_mapper
    return es_companies, alias_name_mapper


def search_file_by_file_uuids(self, uuids, with_doc_fragments_json=False):
    hits = global_es.search(self.index_name, {
        "_source": ESFileObject.keys(exclude=[]) if with_doc_fragments_json else ESFileObject.keys(exclude=["doc_fragments_json"]),
        "size": len(uuids),
        "query": dict(terms=dict(uuid=uuids)),
    })
    return [
        ESFileObject.from_hit(hit["_source"])
        for hit in hits
    ]


def search_company_by_eids_or_uids(ids):
    company_index_name = config['es']['index_company']
    hits = global_es.search(company_index_name, {
        "_source": ["eid", "name", "alias", "uuid"],
        "query": {
            "bool": {
                "minimum_should_match": 1,
                "should": [
                    {"terms": {"eid": ids}},
                    {"terms": {"uuid": ids}}
                ]
            }
        },
        "size": 1.5 * len(ids)
    })
    return [
        dict(
            uuid=hit["_source"]["uuid"],
            eid=hit["_source"]["eid"],
            name=hit["_source"]["name"],
            alias=ensure_list(hit["_source"]["alias"]),
        ) for hit in hits
    ]


def search_engine(query, data_list, score):
    matches = get_close_matches(query, data_list, cutoff=score)
    return matches


def gen_sub_query(query, extract_years):

    for word in filter_words:
        query = query.replace(word, "")

    # 过滤其他关键词
    for words in FR_KEYWORDS.values():
        for word in words:
            query = query.replace(word, "")

    # 过滤年份
    if not extract_years:
        query = query
    else:
        if len(extract_years) > 1:
            for year in extract_years[1:]:
                if year:
                    query = query.replace(f"{year}年", "").replace(f"{year}", "")

        year = extract_years[0]
        query = query.replace(f"{year}年", "").replace(f"{year}", "")

    return query


def file_match(query, matches: list[str], extract_companys) -> list[str]:
    """
    1、获取选定文档的document_uuids
    2、根据file_meta获取file_name、company_name、year、file_title等信息
    3、根据query定位问题所在的文件
    """
    new_file_matches = []
    if len(extract_companys) == 1:
        new_file_matches = list(filter(None, [file_match for file_match in list(set(matches)) if
                                              extract_companys[0] in file_match or file_match in extract_companys[0]]))
    if not new_file_matches:
        file_matches = []
        for extract_company in extract_companys:
            file_matches.extend(search_engine(extract_company, matches, score=0.4))

        file_matches = file_matches or search_engine(query, matches, score=0.3)
        if len(extract_companys) == 1:
            new_file_matches = [file_match for file_match in list(set(file_matches)) if extract_companys[0] in file_match or file_match in extract_companys[0]]

        new_file_matches = new_file_matches or list(set(file_matches))

    return new_file_matches


if __name__ == '__main__':
    query = "国金20年的收入，还有普天科技近几年的行业发展情况如何"
    ret = analyst_query(query)
    print(query, '===>', ret)
