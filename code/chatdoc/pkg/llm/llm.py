'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-02-27 15:18:43
LastEditors: longsion
LastEditTime: 2024-10-14 18:07:49
'''

from pkg.config import config
from pkg.utils.logger import logger
from pkg.llm.baichuan import BaiChuanLLM
from pkg.llm.deepseek import DeepseekAPIInterface
from pkg.llm.kimichat import KimiChatLLM
from pkg.llm.template_manager import TemplateManager

from pkg.llm.tianji import tianjiInterface
from pkg.llm.tyqw import tyqwInterface
from pkg.llm.gpt import GPT
from pkg.llm.tyqw_api import tyqwAPIInterface
from pkg.llm.chat_glm import ChatGlmInterface
from pkg.utils import log_msg


class LLM:

    def __init__(self):
        self._tianji = tianjiInterface()
        self._tyqw = tyqwInterface()
        self._tyqw_api = tyqwAPIInterface()
        self._gpt = GPT(model=config["gpt"]["model"])
        self._baichuan = BaiChuanLLM()
        self._kimichat = KimiChatLLM()
        self._chat_glm = ChatGlmInterface()
        self._deepseek_api = DeepseekAPIInterface()

    def get_model(self):
        return config.get("llm", {}).get("model")

    @log_msg
    def chat(self, prompt, system_message=TemplateManager().get_template('qa_system').format(), stream=None):
        model = self.get_model()
        logger.info(f"llm_model: {model}, model: {config.get(model, {}).get('model')}, prompt len: {len(prompt)}")
        if model == "tyqw":
            return self._tyqw.server_request(prompt, system_message=system_message, stream=stream)

        elif model == "tyqwapi":
            return self._tyqw_api.server_request(prompt, system_message=system_message, stream=stream)

        elif model == "chatglm":
            return self._chat_glm.server_request(prompt, system_message=system_message, stream=stream)

        elif model == "tianji":
            return self._tianji.server_request(prompt)

        elif model == 'baichuan':
            return self._baichuan(prompt=prompt, system_message=system_message, stream=stream)

        elif model == 'kimichat':
            return self._kimichat(prompt=prompt, system_message=system_message)

        elif model == 'deepseek':
            return self._deepseek_api.server_request(prompt, system_message=system_message, stream=stream)

        else:
            return self._gpt(prompt, system_message=system_message, stream=stream)


if __name__ == '__main__':
    prompt = """
你是一个问题相关度评判机器人,请判断问题是否与给出的哪些资料相关。如果存在的话请返回标号列表，否则返回空列表。
例子：
问题：该公司主要采用什么样的经营方式？
资料1：按照经营方式类型分类的工程总承包业务的收入、成本及毛利率构成情况
资料2： 这是一个无关的内容
回答：[1]
问题：该公司经营的范围包括哪些领域？
资料1：3、变更的理由和依据
公司 2007 年末结合当时的经营环境及市场状况，同时参考目前上市公司普遍采用的坏账准备计提水平，判断公司原定对应收款项（包括应收账款和其他应收款）计提坏账准备的计提比例，已不适应公司的实际情况。为了更加客观公正地反映公司的财务状况和经营成果，防范经营风险，经董事会研究，决定变更坏账准备计提方法。
资料2:2、公司所属细分行业
按照所服务的行业应用分类，可以将工业水处理分为电力能源行业水处理、石油化工行业水处理、煤化工行业水处理、造纸行业水处理、冶金行业水处理、金属行业水处理、纺织印染行业水处理、制革行业水处理、农药行业水处理、化学肥料行业水处理等。
公司目前主要从事火电、核电、石化、煤化工、冶金等行业内大型工业项目的水处理业务。通常情况下，本类细分行业的固定资产投资规模和金额巨大，其日常生产经营用水量非常大、水质要求高，对水处理设备的质量和设计水平也均有较高要求。
资料3: 4、会计估计变更对 2008 年度、2009 年度和 2010 年 1-6 月财务状况、经营成果和现金流量影响
单位：万元
|项目|2010年1-6月影响数|2009年度影响数|2008年度影响数|
|-|-|-|-|
|资产总额|-71.67|-116.88|-210.25|
|其中：坏账准备|84.31|137.51|247.35|
|递延所得税资产|12.65|20.63|37.10|
|股东权益|-71.67|-116.88|-210.25|
|其中：盈余公积||1.21|-8.70|
|未分配利润|-71.67|-118.09|-186.54|
|少数股东权益||-|-15.01|
|净利润|-71.67|-116.88|-210.25|

上述会计估计变更调整事项未对公司的现金流量产生影响。
回答：
"""
    ret = LLM().chat(prompt=prompt, system_message=TemplateManager().get_template('qa_system_normal').format())
    print(ret)
