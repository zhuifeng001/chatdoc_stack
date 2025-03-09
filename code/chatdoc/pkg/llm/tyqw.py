'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-02-27 14:14:11
LastEditors: longsion
LastEditTime: 2024-02-27 15:56:31
'''

import time
import tenacity
import requests
from pkg.config import config
from pkg.llm.template_manager import TemplateManager
from pkg.llm.util import result_generator


class tyqwInterface(object):
    """
    通意千问Interface
    """

    def __init__(self):
        self.url = config["tyqw"]["url"]
        self.model = config["tyqw"]["model"]

    @tenacity.retry(wait=tenacity.wait_exponential(multiplier=1, min=5, max=15),
                    stop=tenacity.stop_after_attempt(max_attempt_number=5),
                    reraise=True)
    def server_request(self, prompt, system_message=None, stream=False):
        ip_data = {
            "model": self.model,
            "stream": stream,
            "messages": [
                {"role": "system", "content": system_message or TemplateManager().get_template('qa_system_normal').format()},
                {"role": "user", "content": prompt}
            ]
        }
        start_time = time.time()
        op_data = requests.post(self.url, json=ip_data, stream=stream)
        if op_data.status_code != 200:
            raise Exception(f"Tyqw call error, status_code:{op_data.status_code}, msg: {op_data.json()}")
        if not stream:
            choices = op_data.json().get("choices", [])
            if not (choices and choices[0].get("message", {}).get("role") == "assistant"):
                raise Exception(f"Tyqw call error, status_code:{op_data.status_code}, json: {op_data.json()}")
            return choices[0]["message"]["content"]
        else :
            return result_generator(start_time, op_data)


if __name__ == '__main__':
    tyqw = tyqwInterface()
    prompt = "中国历史有多悠久"
    ret = tyqw.server_request(prompt=prompt, stream=True)
    for i in ret:
        print(i)
