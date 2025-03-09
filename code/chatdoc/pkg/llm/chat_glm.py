'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-08 14:21:03
LastEditors: longsion
LastEditTime: 2024-04-08 15:29:44
'''


import time
import jwt

import tenacity
import requests
from pkg.config import config
from pkg.llm.template_manager import TemplateManager
from pkg.llm.util import result_generator


def generate_token(apikey: str, exp_seconds: int = 3600):
    try:
        id, secret = apikey.split(".")
    except Exception as e:
        raise Exception("invalid apikey", e)

    payload = {
        "api_key": id,
        "exp": int(round(time.time() * 1000)) + exp_seconds * 1000,
        "timestamp": int(round(time.time() * 1000)),
    }

    return jwt.encode(
        payload,
        secret,
        algorithm="HS256",
        headers={"alg": "HS256", "sign_type": "SIGN"},
    )


class ChatGlmInterface(object):
    """
    通意千问Interface
    """

    def __init__(self):
        self.url = config["chatglm"]["url"]
        self.model = config["chatglm"]["model"]
        self.api_key = config["chatglm"]["api_key"]

    @tenacity.retry(wait=tenacity.wait_exponential(multiplier=1, min=5, max=15),
                    stop=tenacity.stop_after_attempt(max_attempt_number=5),
                    reraise=True)
    def server_request(self, prompt, system_message=None, stream=False):
        api_token = generate_token(self.api_key)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_token}",
        }
        ip_data = {
            "model": self.model + "1",
            "stream": stream,
            "messages": [
                {"role": "system", "content": system_message or TemplateManager().get_template('qa_system_normal').format()},
                {"role": "user", "content": prompt}
            ]
        }
        start_time = time.time()
        op_data = requests.post(self.url, json=ip_data, headers=headers, stream=stream)
        if op_data.status_code != 200:
            raise Exception(f"ChatGlm call error, status_code:{op_data.status_code}, msg: {op_data.json()}")
        if not stream:
            choices = op_data.json().get("choices", [])
            if not (choices and choices[0].get("message", {}).get("role") == "assistant"):
                raise Exception(f"ChatGlm call error, status_code:{op_data.status_code}, json: {op_data.json()}")
            return choices[0]["message"]["content"]
        else :
            return result_generator(start_time, op_data)


if __name__ == '__main__':
    chatglm = ChatGlmInterface()
    prompt = "中国历史有多悠久"
    ret = chatglm.server_request(prompt=prompt, stream=True)
    for i in ret:
        print(i)
