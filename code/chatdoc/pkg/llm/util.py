import json
import re
import time

from pkg.utils.logger import logger


stream_fixed_prefix = 'data: '
stream_fixes_suffix = 'data: [DONE]\n\n'


def get_stream_data(data_str):
    if not data_str:
        return ''
    return data_str.split(stream_fixed_prefix)[1]


def get_stream_json(json_str):
    json_str = get_stream_data(json_str)
    return json.loads(json_str)


def set_stream_data(data_str):
    return f"{stream_fixed_prefix}{data_str}\n\n"


def set_stream_json(json_data):
    return set_stream_data(json.dumps(json_data, ensure_ascii=False))


def result_generator(start_time, result, format_func=None, get_chunk_data=None):
    chunk_bytes = b''
    chunk_str = ''
    pre_message = ''
    stream_contents = []
    first_input_time: int = None

    def handle_chunk(chunk_one_str):
        nonlocal pre_message
        nonlocal stream_contents
        try:
            chunk_json = json.loads(chunk_one_str)  # parse the chunk
            if get_chunk_data:
                chunk_json = get_chunk_data(chunk_json)
        except Exception:
            return None
        data = None
        if chunk_json["choices"][0].get("finish_reason") == 'stop':
            delta_message = chunk_json["choices"][0].get("delta", {}).get("content", "")
            data = {"content": delta_message, "status": "DONE"}

        else:

            if chunk_json["choices"][0].get("delta"):
                delta_message = chunk_json["choices"][0]["delta"].get("content", "")
            else:
                total_message = chunk_json["choices"][0].get("message", {}).get("content", "")
                delta_message = re.sub(fr"^{pre_message}", "", total_message)
                pre_message = total_message

            data = {"content": delta_message, "status": "DOING"}

        chunk_time = time.time() - start_time
        stream_contents.append((delta_message, f"{1000*chunk_time:.1f}ms"))
        # logger.info(f"Stream message received {chunk_time:.3f} seconds after request: {json.dumps(data, ensure_ascii=False)}")
        return data

    fixed_prefix = stream_fixed_prefix.strip()

    for chunk in result:
        if type(chunk) is str:
            chunk = chunk.encode("utf-8")
        chunk_bytes += chunk
        try:
            # errors='ignore' 忽略解码错误，解决乱码问题
            chunk_str = chunk_bytes.decode('utf-8', errors='ignore')
            if format_func:
                chunk_str = format_func(chunk_str)
        except Exception as e:
            logger.error(f"Decode chunk error: {e}")
            # chunk_bytes 为json一部分，可能会出现解码错误，发生错误后继续拼接，可以忽略
            continue
        while fixed_prefix in chunk_str:
            temp_list = chunk_str.split(fixed_prefix)
            if temp_list[0]:
                data = handle_chunk(temp_list[0])
                if not first_input_time:
                    first_input_time = time.time()
                if data:
                    data["status"] = "DOING"
                    yield set_stream_json(data)
            chunk_str = ''.join(temp_list[1:])
            chunk_bytes = chunk_str.encode("utf-8")

    if chunk_str:
        data = handle_chunk(chunk_str)
        if data:
            data["status"] = "DOING"
            yield set_stream_json(data)

    chunk_time = time.time() - start_time
    logger.info(f"Stream messages received: {stream_contents}")
    logger.info(f"Finally Stream message received {chunk_time*1000:.1f}ms after request, answer_len: {sum([len(x[0]) for x in stream_contents])}")
    if not first_input_time:
        first_input_time = time.time()
    logger.info(f"Stream message Total time: {1000*(time.time() - first_input_time):.1f}ms")

    # 手动触发停止
    data = {"content": "", "status": "DONE"}
    yield set_stream_json(data)
    yield stream_fixes_suffix


def check_repetition(text, delta_text):
    full_text = text + delta_text
    window_size = 50
    threshold = 3

    # 截取最近的50个字符作为判断字符串
    judge_str = full_text[-window_size:]

    # 计算judge_str在full_text中的出现次数
    count = full_text.count(judge_str)

    # 如果重复次数达到或超过阈值
    if count >= threshold:
        # 分割文本以找到重复字符串前后的文本
        parts = full_text.split(judge_str)

        # 检查是否有足够的部分进行比较
        if len(parts) >= 3:
            # 检查重复字符串之间的文本是否相同
            if parts[1] == parts[2]:
                logger.info(f"Detected repetition. judge_str: {judge_str}, full_text: {full_text}")
                return True

    return False

    # # 示例
    # text = "这是一个测试文本，我们正在检查连续重复的问题。"
    # delta_text = "这是一个测试文本，我们正在检查连续重复的问题。这是一个测试文本，我们正在检查连续重复的问题。"
    # is_repeated = check_repetition(text, delta_text)


def remove_repetition(text, delta_text):
    full_text = text + delta_text
    window_size = 50
    threshold = 3

    # 截取最近的50个字符作为判断字符串
    judge_str = full_text[-window_size:]

    # 计算judge_str在full_text中的出现次数
    count = full_text.count(judge_str)

    # 如果重复次数达到或超过阈值
    if count >= threshold:
        cursor = len(full_text) - window_size
        while cursor >= 0:
            _judge_str = full_text[cursor:cursor + window_size]
            if full_text.count(_judge_str) < count:
                # 往左往前匹配
                break
            judge_str = _judge_str
            cursor -= 1

        # 分割文本以找到重复字符串前后的文本
        parts = full_text.split(judge_str)
        # 检查是否有足够的部分进行比较
        if len(parts) >= 3:
            # 检查重复字符串之间的文本是否相同
            if parts[1] == parts[2]:
                new_text = parts[0] + judge_str + parts[1]
                # 加上结尾的标点符号！
                if judge_str and judge_str[0] in ["。", ".", "!"] and parts[1] and parts[1][-1] not in ["。", ".", "!"]:
                    new_text += judge_str[0]

                return new_text

    return full_text


# print(check_repetition(
#     "2023年，公司实现营业收入195,163.02万元，同比增长14.95%。其中，汽车流体管路及总成营业收入129,331.39万元，同比增长6.53%；汽车密封部件及总成营业收入63,656.19万元，同比增长36.99%。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。",
#     "公司营业收入的增长主要"
# ))

# print(remove_repetition(
#     "2023年，公司实现营业收入195,163.02万元，同比增长14.95%。其中，汽车流体管路及总成营业收入129,331.39万元，同比增长6.53%；汽车密封部件及总成营业收入63,656.19万元，同比增长36.99%。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。公司营业收入的增长主要得益于汽车流体管路及总成和汽车密封部件及总成营业收入的增长。",
#     "公司营业收入的增长主要"
# ))
