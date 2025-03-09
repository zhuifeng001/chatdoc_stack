import time
import requests
from pkg.config import config
from pkg.llm.template_manager import TemplateManager
from pkg.llm.util import result_generator
from pkg.utils import retry_exponential_backoff
from pkg.utils.logger import logger


class DeepseekAPIInterface(object):
    """
    通意千问Interface
    """

    def __init__(self):
        self.url = config["deepseek"]["url"]
        self.model = config["deepseek"]["model"]
        self.api_key = config["deepseek"]["api_key"]

    @retry_exponential_backoff()
    def server_request(self, prompt, system_message=None, stream=False):
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        ip_data = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_message or TemplateManager().get_template('qa_system_normal').format()
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": stream
        }

        start_time = time.time()
        op_data = requests.post(self.url, json=ip_data, headers=headers, stream=stream)
        if op_data.status_code != 200:
            raise Exception(f"Deepseek API call error, status_code:{op_data.status_code}, msg: {op_data.json()}")
        if not stream:
            choices = op_data.json().get("choices", [])
            return choices[0]["message"]["content"]
        else:
            print_request_id = False

            def get_chunk_data(chunk_json):
                nonlocal print_request_id
                if not print_request_id:
                    logger.info(f'deepseek request_id: {chunk_json["id"]}')
                    print_request_id = True
                return chunk_json
            return result_generator(start_time, op_data, get_chunk_data=get_chunk_data)


if __name__ == '__main__':
    deepseekChat = DeepseekAPIInterface()
    prompt = """你是一个AI问答机器人，请结合给出的问题和相关内容（包含表格Markdown和段落），严格按照要求回答问题。
要求如下：
- 如果在多个段落中有不同的答案，优先匹配最前面的；
- 答案可以通过计算得出，需要给出详细计算公式和过程；
- 答案中存在数值并且数值存在给出的内容中，请输出原始数值，不需要格式化；
- 如果问题答案中有名词简称，请给出对应的全称，格式为"全称（简称）"；
- 问题答案中不要出现乱码。
- 在给出的内容中未提供答案，请返回"无"

问题：该公司在各个报告期内，经营活动所产生的净现金流量分别是多少？
该公司是深圳市铁汉生态环境股份有限公司
相关内容：'''$经营活动产生的现金流量净额与当期净利润差异分析：
|项目|2010年1-9月|2009年度|2008年度|2007年度|
|-|-|-|-|-|
|净利润|4461.48|4967.44|2034.11|880.25|
|加：1、计提的资产减值准备|39.68|90.38|19.52|-28.85|
|2、固定资产折旧、油气资产折耗、生产性生物资产折旧|219.05|152.37|120.27|102.84|
|3、无形资产摊销|1.16|10.88|12.01|11.54|
|4、长期待摊费用摊销|50.06|6.75|-|-|
|5、处置固定资产、无形资产和其他长期资产的损失（减：收益）|-|-1294.37|-|-|
|6、固定资产报废损失|-|-|-|-|
|7、公允价值变动损失|-|-|-|-|
|8、财务费用|111.32|130.58|10.04|27.16|
|9、投资损失（减：收益）|-|-21.09|-|-|
|10、递延所得税资产减少（减：增加）|-5.95|-13.23|-2.74|4.59|
|11、递延所得税负债增加（减：减少）|-|-|-|-|
|12、存货的减少（减：增加）|-7686.99|-4200.84|-1097.13|-869.99|
|13、经营性应收项目的减少（减：增加）|-399.01|-1320.13|-143.42|231.22|
|14、经营性应付项目的增加（减：减少）|-907.16|1193.03|-1172.87|-460.05|
|15、其他|-|-|-|-|
|经营活动产生的现金流量净额|-4116.36|-298.45|-220.21|-101.30|


合并现金流量表主要数据：
|项目|2010年1-9月|2009年度|2008年度|2007年度|
|-|-|-|-|-|
|经营活动产生的现金流量净额|-4116.36|-298.45|-220.21|-101.30|
|投资活动产生的现金流量净额|-1514.54|-23.25|124.04|-177.28|
|筹资活动产生的现金流量净额|2324.02|7000.37|-409.75|1380.84|
|汇率变动对现金及现金等价物的影响|0.00|-|-0.29|-|
|现金及现金等价物净增加额|-3306.88|6678.68|-506.21|1102.27|
'''
"""
    print('prompt Length: ', len(prompt))
    ret = deepseekChat.server_request(prompt=prompt, stream=True)
    for s in ret:
        print(s)
