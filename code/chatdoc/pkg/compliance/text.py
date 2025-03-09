'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-03-25 16:19:13
LastEditors: longsion
LastEditTime: 2025-03-09 07:34:54
'''

from pkg.config import config
from pkg.utils.logger import logger

from tenacity import retry, stop_after_attempt, stop_after_delay
import requests
import uuid


class TextCompliance(object):
    """
    参考 https://xxxx/pages/viewpage.action?pageId=142868825
    """

    def __init__(self):
        self.url = config["compliance"]["text_url"]
        self.censors = config["compliance"]["censors"]
        self.timeout = config["compliance"]["timeout"]

    """
    app	string	数据源产品线，见下方支持的产品线列表	是	cc
    requestid	string	请求id；后续可以通过该值重复查询检验结果；每个app不同请求的requestid请保持唯一	是	123
    channel	string	数据源渠道；见下方数据源渠道列表	否	NICKNAME
    source_ip	string	数据源ip	否	101.95.128.162
    source_uid	string	数据源用户ID；未登录用户该值为空字符串	否	abcdefg
    source_account_type	string	数据源用户账号类型，可选值为email和mobile；未登录用户该值为unlogin	否	email
    source_account	string	数据源用户账号；未登录用户该值为空字符串	否	test@intsig.net
    censors	string	指定的检测厂商；可以选择多个厂商，厂商名之间以 , 分隔，可选值见下方数据检测参数列表；该值的默认值为 default，即使用 默认供应商 检测。检测顺序按照供应商排序串行执行。一旦有供应商检测出问题，则立刻返回。返回结果包括该供应商检测结果和 default 供应商检测结果（此时 default 供应商检测结果就是该供应商检测结果），不再做后续供应商的检测。如果所有供应商都没有检测出问题，则返回所有供应商的检测结果和 default 供应商检测结果（此时 default 供应商检测结果就是 默认供应商 检测结果）。目前的 默认供应商 为 yidun,default默认供应商会视供应商情况调整	否	yidun
    is_inner_censor	int	是否需要走内部敏感词检测；0不需要1需要，默认0；如果需要，则在所有供应商执行完毕且没有检测出问题时再走内部敏感词检测。内部敏感词检测结果会以 inner 供应商和 default 供应商的结果返回	否	0
    check_types	string	检查类型；可以选择多个类型，类型名之间以,分隔；详情见下方检查类型check_types取值列表；默认值目前为全部类型
    """

    @retry(stop=(stop_after_attempt(3) | stop_after_delay(5)), retry_error_callback=lambda x: True)
    def is_text_valid(self, text: str, request_id: str = None):

        request_id = request_id or str(uuid.uuid4())

        valid = True
        if not text:
            return valid
        params = dict(
            app="acg",
            channel="ARTICLE",
            censors=self.censors,
            requestid=request_id,
        )
        ip_data = dict(data=text)
        op_data = requests.post(self.url, params=params, json=ip_data, timeout=self.timeout)
        if op_data.status_code != 200:
            msg = f"text compliance call error, p1, status_code:{op_data.status_code}, msg: {op_data.json()}"
            logger.error(msg)
            raise Exception(msg)

        resp = op_data.json()
        if resp.get("ret") != 200001:
            msg = f"text compliance call error, p2, status_code:{op_data.status_code}, msg: {op_data.json()}"
            logger.error(msg)
            raise Exception(msg)

        # 检测是否成功。0为成功，1为失败
        # 检测结果。0为合法，1为可疑建议人工审核，2为不合法；当is_success为1时，该值无意义
        is_success = resp.get("data", dict()).get("censor_results", dict()).get(self.censors, dict()).get("is_success", -1)
        is_valid = resp.get("data", dict()).get("censor_results", dict()).get(self.censors, dict()).get("is_valid", -1)

        if is_success != 0 or is_valid == -1:
            msg = f"text compliance call error, p3, status_code:{op_data.status_code}, msg: {op_data.json()}"
            logger.error(msg)
            raise Exception(msg)

        if is_valid == 0:
            valid = True
        else:
            valid = False
            hint_v2 = resp.get("data", dict()).get("censor_results", dict()).get(self.censors, dict()).get("hint_v2")
            logger.warning(f"text compliance call is_valid: {is_valid}, text: {text}, hint_v2: f{hint_v2}")

        return valid


if __name__ == '__main__':
    tc = TextCompliance()
    text = "北京新科仪仁有江泽之民限责任公司"
    request_id = str(uuid.uuid4())
    ret = tc.is_text_valid(request_id=request_id, text=text)
    logger.error(f"ret: {ret}")
