import requests
import random
import re
import os
import time
import hashlib

from pkg.config import config
from pkg.llm.template_manager import TemplateManager
from pkg.llm.util import result_generator


class GPT(object):
    def __init__(self, platform_id="Gfx1aePxd6gfJEO7PYprG7KUx3mzNN30", model="gpt-35-turbo", username=None,
                 api_key=None):
        self.platform_id = platform_id
        self.model = model

        if username is None:
            self.username = os.getenv("USERNAME", "amanda")
        else:
            self.username = username
        if api_key is None:
            self.api_key = os.getenv("OPENAI_API_KEY")
        else:
            self.api_key = api_key

        self.user = self._get_md5_32(self.username)

    def __call__(self, prompt, system_message=None, stream=None):
        messages = [
            {"role": "system", "content": system_message or TemplateManager().get_template('qa_system_normal').format()},
            {"role": "user", "content": prompt}]
        start_time = time.time()
        try:
            retry_after = 1
            jitter = random.randint(0, 5)
            while retry_after:
                result = self.create_chat_completion(messages=messages, model=self.model, temperature=0.1,
                                                     top_p=1, n=1, stream=stream)
                if result.status_code == 429:
                    retry_after *= 2
                else:
                    if result.headers['Content-Type'] == 'application/json':
                        result = result.json()
                        if "error" in result and result["error"]["code"] == "429":
                            search = re.search(
                                r"Please retry after ([0-9]+) second", result["error"]["message"])
                            retry_after = int(search.group(1)) + \
                                jitter if search else 0
                        else:
                            retry_after = 0
                    else:
                        retry_after = 0

                if retry_after > 0:
                    print("Retry after", retry_after, "seconds...")
                    time.sleep(retry_after)
        except Exception as e:
            print(f"Can't get : {e}, error msg: {result}")
        try:
            print("prompt_len:", len(prompt))
            if not stream:
                chunk_time = time.time() - start_time  # calculate the time delay of the chunk
                message = result["choices"][0]["message"]["content"]
                print(f"Message received {chunk_time:.2f} seconds after request: {message}")
                return result["choices"][0]["message"]["content"]
            else:
                return result_generator(start_time, result)
        except Exception as e:
            print(result)
            print('llm error', e)
            return "很抱歉，暂时无法回答您的问题，请尝试重新提问吧。"

    def reset_max_tokens(self, max_tokens):
        self.max_tokens = max_tokens

    def create_chat_completion(self, messages, model="gpt-35-turbo", temperature=0.1, top_p=1, n=1,
                               stream=False, stop=None, presence_penalty=0,
                               frequency_penalty=0, logit_bias=None):
        """Intsig proxy chatgpt"""

        json_text = {
            "messages": messages,
            "user": self.user,
            "temperature": temperature,
            "top_p": top_p,
            "n": n,
            "stream": stream,
        }
        headers_json = {'user-agent': 'apifox/1.0.0 (https://www.apifox.cn)',
                        'Content-Type': 'application/json'}
        url = f'{config["gpt"]["proxy"]}/azure/gpt/v1?platform_id={self.platform_id}&model_name={model}'
        print("url:", url)
        completion = requests.post(url=url,
                                   headers=headers_json,
                                   json=json_text,
                                   stream=stream)
        # a = json.dumps(json_text,ensure_ascii=False)
        print("completion:", completion)
        return completion

    def _get_md5_32(self, text):
        """Encoding username"""
        input_bytes = text.encode('utf8')
        data = hashlib.md5(input_bytes)
        return data.hexdigest()

    def generate_random_str(self, length=16):
        base = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
        s = ""
        for _ in range(length):
            s += random.choice(base)
        return s


if __name__ == "__main__":
    model_name = "gpt-35-turbo-16k"
    # model_name = "gpt-4"
    prompt = "中国历史有多悠久"
    model = GPT(model=model_name)
    # print(model(prompt))
    ret = model(prompt, system_message=None, stream=True)
    for i in ret:
        print(i)
