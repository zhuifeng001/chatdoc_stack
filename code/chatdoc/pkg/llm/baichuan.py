import time
import tenacity
import requests
from pkg.config import config
from pkg.llm.template_manager import TemplateManager
from pkg.llm.util import result_generator


class BaiChuanLLM(object):
    def __init__(self):
        self.url = config["baichuan"]["url"]
        self.model = config["baichuan"]["model"]
        self.api_key = config["baichuan"]["api_key"]

    @tenacity.retry(wait=tenacity.wait_exponential(multiplier=1, min=5, max=15),
                    stop=tenacity.stop_after_attempt(max_attempt_number=5),
                    reraise=True)
    def __call__(self, prompt, system_message, stream=False):
        ip_data = {
            "model": self.model,
            "messages": [
                {"role": 'system', "content": system_message or TemplateManager().get_template('qa_system_normal').format()},
                {"role": 'user', "content": prompt}
            ],
            "temperature": 0.3,
            "topP": 0.85,
            "withSearchEnhance": False,
            "stream": stream
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        start_time = time.time()
        op_data = requests.post(self.url, json=ip_data, headers=headers, stream=stream)
        if op_data.status_code != 200:
            raise Exception(f"Baichuan call error, status_code:{op_data.status_code}, msg: {op_data.json()}")
        if not stream:
            choices = op_data.json().get("choices", [])
            if op_data.status_code != 200 or not (choices and choices[0].get("message", {}).get("role") == "assistant"):
                raise Exception(f"Baichuan call error, status_code:{op_data.status_code}, json: {op_data.json()}")
            return choices[0]["message"]["content"]
        else :
            return result_generator(start_time, op_data)


if __name__ == '__main__':
    ret = BaiChuanLLM()('中国的面积有多大，排名第几', system_message="", stream=False)
    for i in ret:
        print(i)
