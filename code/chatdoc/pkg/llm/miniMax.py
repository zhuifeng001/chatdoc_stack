import requests


class MiniMaxInterface(object):
    def __init__(self):
        self.base_url = "https://api.minimax.chat/v1/text/chatcompletion"
        self.group_id = "1679829365734903"
        self.url = f"{self.base_url}?GroupId={self.group_id}"
        self.api_key = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJTdWJqZWN0SUQiOiIxNjc5ODI5MzY1MzM3NzIzIiwiUGhvbmUiOiIxMzcqKioqOTA1MiIsIkdyb3VwSUQiOiIiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiJ4aW5nX3RlbmdAaW50c2lnLm5ldCIsImlzcyI6Im1pbmltYXgifQ.J-g0uYRantTqopXKwIjMXdqE4McsJR_Y4W5JPPNGiqw6QWB1mQxeq2B2UthfO6Ac0CgsBS-MxIZS6t_ky3gBht86CJV1W4oNypXtMnRd7gPnT69ookfU6NyzE4U6r4ccHjKRb6ScN4oAovoPispktKAZVmsLmWFyjjXxAJHt6IiVxFj7XTwlnouAn8xIY_0lRXYxiipUAsDnNYOUDbDSG_B05QRKqQodKc-t0CJ4mLjqmBI-bxfbAUsFFqC8JtiGpqvY4ukXjWTbwRYFRb7Js_Ja0nXZQmHMO2FdDSTCswi3xlbItwVURBMO-Ncf-ktvZXPl1xk_Km52iCpgG96nPw"
        self.headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def server_request(self, prompt, max_tokens=4096):
        json_data = {"model": "abab5-chat",
                     "messages": [{"sender_type": "USER", "text": prompt}],
                     "tokens_to_generate": max_tokens}

        resp = requests.post(url=self.url, json=json_data, headers=self.headers)

        if resp.status_code != 200:
            print(f"error:{resp}, prompt: {prompt}")
        return resp.json()
