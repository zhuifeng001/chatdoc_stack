import time
import tenacity
import requests
from pkg.config import config
from pkg.llm.template_manager import TemplateManager


class KimiChatLLM(object):
    def __init__(self):
        self.url = config["kimichat"]["url"]
        self.model = config["kimichat"]["model"]
        self.api_key = config["kimichat"]["api_key"]

    @tenacity.retry(wait=tenacity.wait_exponential(multiplier=1, min=5, max=15),
                    stop=tenacity.stop_after_attempt(max_attempt_number=5),
                    reraise=True)
    def __call__(self, prompt, system_message):
        time.sleep(15)
        ip_data = {
            "model": self.model,
            "messages": [
                {"role": 'system', "content": system_message or TemplateManager().get_template('qa_system_normal').format()},
                {"role": 'user', "content": prompt}
            ],
            "temperature": 0.3,
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        op_data = requests.post(self.url, json=ip_data, headers=headers)
        choices = op_data.json().get("choices", [])
        if op_data.status_code != 200 or not (choices and choices[0].get("message", {}).get("role") == "assistant"):
            raise Exception(f"KimiChat call error, status_code:{op_data.status_code}, json: {op_data.json()}")

        return choices[0]["message"]["content"]


if __name__ == '__main__':
    res = KimiChatLLM()('中国的面积有多大，排名第几')
    print(res)
