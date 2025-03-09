import json
import tenacity
import requests
from pkg.config import config


class tianjiInterface(object):
    def __init__(self):
        self.url = config["tianji"]["url"]

    @tenacity.retry(wait=tenacity.wait_exponential(multiplier=1, min=5, max=15),
                    stop=tenacity.stop_after_attempt(max_attempt_number=5),
                    reraise=True)
    def server_request(self, prompt):
        history = []
        sample_input = {
            "prompt": prompt,
            "stream": False,
            "max_tokens": 512,
            "version": "gamma",
            "history": history,
            "temperature": 0.0,
        }
        output = requests.post(self.url, json=sample_input)
        line = [line.decode("utf-8") for line in output.iter_lines()][-1]
        result = json.loads(line)["text"]
        return result


def tian_embedding(sentences):
    example_embedding = {
        "sentences": sentences
    }
    URL = "https://chat.ai.intsig.net/get_embedding"
    output = requests.post(URL, json=example_embedding)
    res = output.json()
    print(res)
    return res


if __name__ == '__main__':
    res = tianjiInterface().server_request('你好')
    print(res)
