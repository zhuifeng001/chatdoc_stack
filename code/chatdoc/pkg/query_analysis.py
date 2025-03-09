import requests


def query_extract_uie(url, query):
    """
    调用UIE(https://arxiv.org/pdf/2203.12277.pdf)训练的信心抽取模型，抽取字段为'年份','日期','关键字'三个字段.
    Args:
        url: 模型部署的URL.
        query: 要抽取的问题.

    Returns: 抽取的三个字段的字典.

    """
    res = {
        "years": [],
        "companys": [],
        "key_words": []
    }
    json_text = {
        "input": query
    }
    headers_json = {'Content-Type': 'application/json'}
    completion = requests.post(url=url,
                               headers=headers_json,
                               json=json_text)
    completion.raise_for_status()
    query_analysis_res = completion.json()
    res["years"] = query_analysis_res["years"]
    res["companys"] = query_analysis_res["companys"]
    res["key_words"] = query_analysis_res["keywords"]
    return res
