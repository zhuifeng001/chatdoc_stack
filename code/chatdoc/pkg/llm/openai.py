import requests
import random
import re
import os
import time
import hashlib


class gptInterface(object):
    def __init__(self, platform_id='Gfx1aePxd6gfJEO7PYprG7KUx3mzNN30', model="gpt-35-turbo", max_ans_tokens=1000, username=None, api_key=None):
        self.platform_id = platform_id
        self.model = model
        self.max_tokens = max_ans_tokens

        if username is None:
            self.username = os.getenv("USERNAME", "amanda")
        else:
            self.username = username

        self.user = self._get_md5_32(self.username)

    def server_request_(self, prompt, temperature=0.1, top_p=1, n=1):

        try:
            retry_after = 1
            jitter = random.randint(0, 5)
            while retry_after:
                result = self.create_chat_completion(messages=prompt, model=self.model, temperature=temperature,
                                                     top_p=top_p, n=n, max_tokens=self.max_tokens)
                if result.status_code == 429:
                    retry_after *= 2
                else:
                    result = result.json()
                    if "error" in result and result["error"]["code"] == "429":
                        search = re.search(r"Please retry after (\d+) second", result["error"]["message"])
                        retry_after = int(search.group(1)) + jitter if search else 0
                    else:
                        retry_after = 0
                if retry_after > 0:
                    print("Retry after", retry_after, "seconds...")
                    time.sleep(retry_after)
        except Exception as e:
            print(f"Can't get : {e}, error msg: {result}")

        return result

    def reset_max_tokens(self, max_tokens):
        self.max_tokens = max_tokens

    def server_request(self, prompt, model="gpt-35-turbo", temperature=0.1, top_p=1, n=1,
                       stream=False, stop=None, max_tokens=1000, presence_penalty=0,
                       frequency_penalty=0, logit_bias=None):
        """Intsig proxy chatgpt"""
        messages = [{"role": "user", "content": prompt}]

        json_text = {
            "messages": messages,
            "user": self.user,
            "temperature": temperature,
            "top_p": top_p,
            "n": n,
            "max_tokens": max_tokens
        }
        headers_json = {'user-agent': 'apifox/1.0.0 (https://www.apifox.cn)',
                        'Content-Type': 'application/json'}
        url = f'https://xxxxx/azure/gpt/v1?platform_id={self.platform_id}&model_name={model}'
        completion = requests.post(url=url,
                                   headers=headers_json,
                                   json=json_text)
        completion = completion.json()
        if model == "gpt-35-turbo":
            text = completion["choices"][0]["message"]["content"]
        else:
            text = completion["choices"][0]["text"]
        return text

    @staticmethod
    def _get_md5_32(text):
        """Encoding username"""
        input_bytes = text.encode('utf8')
        data = hashlib.md5(input_bytes)
        return data.hexdigest()

    @staticmethod
    def generate_random_str(length=16):
        base = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
        s = ""
        for _ in range(length):
            s += random.choice(base)
        return s
