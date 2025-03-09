import requests
from wudao.api_request import executeEngine, getToken


class ChatGLMInterface(object):

    def __init__(self):
        self.API_KEY = "92d95e28043c493f9bc886dde3a1e456"
        self.PUBLIC_KEY = "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJlnEY2SP/XpUVp5F6TkHRRK5bepD7r0+zPumaZ5VPcLaLKNYeN7tePhOsKNn1NmXI2Smlq/Vak6fahWKxtVkj0CAwEAAQ=="
        self.ability_type = "chatGLM"
        self.engine_type = "chatGLM"
        # self.ability_type = "chatglm_6b"
        # self.engine_type = "chatglm_6b"

        token_result = getToken(self.API_KEY, self.PUBLIC_KEY)

        if token_result and token_result["code"] == 200:
            self.token = token_result["data"]
        else:
            print("获取token失败，请检查 API_KEY 和 PUBLIC_KEY")

    def server_request(self, prompt):
        json_data = {
            "top_p": 0.7,
            "temperature": 0.9,
            "prompt": prompt,
            "history": [],
        }

        response = executeEngine(self.ability_type, self.engine_type, self.token, json_data)

        return response


class ChatGLMV2Interface(object):

    def __init__(self):
        self.url = "https://oapi-us-workonly.camscanner.com/finance/dev/back2/v1/py/chatglm/chat"

    def server_request(self, prompt):
        json_data = {
            "temperature": 0.0,
            "content": prompt,
        }

        response = requests.post(self.url, json=json_data)
        result = response.json()["data"]["context"].replace("\n", "")
        return result
