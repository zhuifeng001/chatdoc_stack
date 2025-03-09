from typing import Dict, List, Union, Optional
from dataclasses import dataclass
from collections import OrderedDict
import re
import requests
from pkg.utils.logger import logger


@dataclass
class Span:
    start: int
    end: int


@dataclass
class Pair:
    text: str
    span: Span

    @property
    def start(self):
        return self.span.start

    @property
    def end(self):
        return self.span.end


@dataclass
class GenerationOutput(OrderedDict):
    tokens: List[str] = None
    input_len: int = None
    decoded_text: str = None
    char_to_token_map: Optional[Dict[int, int]] = None
    token_score_map: Optional[Dict[str, float]] = None


def parse_yaml(data: str) -> Dict[str, Union[str, list]]:
    def calc_span_score(start: int, end: int):
        if start >= end:
            return 0.
        elif (tok_s := data.char_to_token_map[start]) >= (tok_e := data.char_to_token_map[end - 1] + 1):
            return 0.
        else:
            return round(sum(data.token_score_map[j] for j in range(tok_s, tok_e)) / (tok_e - tok_s), 4)

    def parse_list(pairs: List[Pair]) -> dict:
        if (supper_key := split_pair(pairs[0])[0]) in result:
            return

        result[supper_key] = []
        for pair in pairs[1:]:
            if ptn_lst.search(pair.text):
                result[supper_key].append({})
            if result[supper_key] and ":" in pair.text:
                key, value, span = split_pair(pair)
                if isinstance(data, GenerationOutput):
                    score = calc_span_score(span.start, span.end)
                    result[supper_key][-1][key] = {"value": value, "score": score}
                else:
                    result[supper_key][-1][key] = value

        pairs.clear()

    def parse_kv(pair: Pair):
        label, value, span = split_pair(pair)
        if label not in result:
            if isinstance(data, GenerationOutput):
                score = calc_span_score(span.start, span.end)
                result[label] = {"value": value, "score": score}
            else:
                result[label] = value

    def split_pair(pair: Pair):
        idx = pair.text.index(":")
        key, value = pair.text[:idx], pair.text[idx + 1:]
        start = pair.start + idx + 1
        key = re.sub("^[-\\s]+", "", key)
        value = value.rstrip()
        while value and value[0] in (" ", "\n"):
            value = value[1:]
            start += 1

        end = start + len(value)
        return key, value, Span(start, end)

    ptn_lst = re.compile("^\\s*-\\s")
    # pairs = [pair.rstrip() for pair in data.strip().split("\n") if ptn_lst.search(pair) or ":" in pair]
    result = {}
    stack = []

    pairs: List[Pair] = []
    # TODO: 区分kv间的\n和跨行间的\n
    for i, pair in enumerate(re.finditer("[^\n]+", data if isinstance(data, str) else data.decoded_text)):
        text, (start, end) = pair.group(), pair.span()
        while i == 0 and text and text[0] in (" ", "\n"):
            text = text[1:]
            start += 1
        # TODO: 区分时间的冒号和k：v的冒号
        if ptn_lst.search(text) or ":" in text or text[-1] == ':':
            pair = Pair(text=text, span=Span(start, end))
            pairs.append(pair)
        elif len(pairs) == 0:
            continue
        else:
            pairs[-1].text += text
            pairs[-1].span.end = end

    for i, pair in enumerate(pairs):
        if stack:
            if pair.text.startswith((" ", "-")):  # 217 218两行置换会跳过空格开头的kv
                stack.append(pair)
        elif ":" in pair.text:
            if stack:
                parse_list(stack)
            if pair.text.strip().endswith(":") and i < len(pairs) - 1 and pairs[i + 1].text.lstrip().startswith("-"):
                stack = [pair]
            else:
                parse_kv(pair)

    if stack:
        parse_list(stack)

    return result


def ie_vllm(text, single, ie_url, model="acgpt-1.0"):
    prompt = make_ie_prompt(text, single)
    json_dict = {
        "model": model,
        "stream": "false",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 2000
    }
    resp = requests.post(url=ie_url, json=json_dict)
    resp = resp.json()
    try:
        ie_res = resp['choices'][0]['message']['content']
    except Exception as e:
        logger.warning(f"ie_vllm exception: {e}")
        ie_res = ''
    ie_res = parse_yaml(ie_res)
    return ie_res


def make_ie_prompt(text=None, single=None, multiple=None, item=None, example=None, instruction=None, prompt=None,
                   format=False):
    prompt = f"""\
### Instruction:
Extract entities from the input text lines and output according to the following requirements:
1. Output only one best value for single value entities even if the entity has multiple values.
2. Output empty if an entity has no value.
3. What you see is what you output without any standardization.\
"""

    # #3. Standardize the entity of invoice date and payment due date to YYYY-mm-dd format and output at the end of single entities named normalized invoice date and normalized payment due date.\

    prompt = prompt.replace("input  text", "input text")

    if single:
        str_single = "\n".join("- " + v for v in single)
        prompt += "\n\nEntities with single value are output as a string:"
        prompt += "\n" + str_single

    if multiple:
        str_multiple = "\n".join("- " + v for v in multiple)
        prompt += "\n\nEntities with multiple values output as a list of strings:"
        prompt += "\n" + str_multiple

    if item:
        str_item = "\n".join("- " + v for v in item)
        prompt += "\n\nEntities in relation group output as a list of dictionaries containing " \
                  "a set of key-value pairs:"
        prompt += "\nrow:\n" + str_item

    if example:
        assert isinstance(example, list)
        prompt += '\nHere are some examples for reference:\n'
        for i, eg in enumerate(example):
            prompt += '(' + str(i + 1) + ')'
            prompt += '#input lines:\n'
            prompt += eg['input'] + '\n'
            prompt += '#the corresponding output:\n'
            prompt += eg['output'] + '\n'
    if format:
        prompt += '\nThe output format should following:\n{'
        # out_dict = '{}'
        if single:
            for entity in single:
                prompt += f'"{entity}": "xxx",'
        if item:
            prompt += '"row": [{'
            for entity in item:
                prompt += f'"{entity}": "xxx",'
            prompt = prompt[:-1] + '}]'
        if prompt[-1] == ',':
            prompt = prompt[:-1] + '}\n where xxx is placeholder.\n\n\n'
        else:
            prompt = prompt + '}\n where xxx is placeholder.\n\n\n'

    prompt += "\n\n### Input lines:\n" + text
    prompt += "\n### Output:\n"

    return prompt


if __name__ == '__main__':
    single = ["company_code", "company_name", "year", "file_name", "人名", "职位"]
    text = "公司代码：600383\n公司简称：金地集团\n金地（集团）股份有限公司\n2021 年年度报告，董事长：凌克\n二零二二年四月二十一日"
    ie_url = "https://frameselection.intsig.net/cci_ai/service/v1/transfer_request?host=http://10.48.2.2:2222&path=/v1/chat/completions"
    res = ie_vllm(text, single, ie_url, model="acgpt-1.0")
    print(res)
