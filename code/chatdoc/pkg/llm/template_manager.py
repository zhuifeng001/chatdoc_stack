from pkg.llm.prompts import QA_PROMPT_V2, QA_PROMPT_V2_GLOBAL


class PromptTemplate:
    def __init__(self, input_variables, template):
        self.input_variables = input_variables
        self.template = template

    def format(self, **kwargs):
        # 检查所有定义的必需变量是否都已提供
        for var in self.input_variables:
            if var not in kwargs:
                raise ValueError(f"Missing value for '{var}'")

        # 替换模板中的变量
        return self.template.format(**kwargs)


class TemplateManager:
    def __init__(self):
        """
        问题的模板文件：
        basic_input: 基础信息
        open_input： 开放性问题
        ratio_input： 比率计算问题
        """
        self.templates = {
            "open_input": PromptTemplate(
                input_variables=["question"],
                template="{question}."
            ),
            "basic_input": PromptTemplate(
                input_variables=["context", "question"],
                template="已知信息：\n{context}\n"
                         "简洁和专业的来回答用户的问题，在回答涉及数字的回复时，请用纯数字，若问题有要求小数点请遵守。"
                         "如果无法从中得到答案，可以乱编。答案请使用中文。 问题是：{question}."
            ),
            "ratio_input": PromptTemplate(
                input_variables=["context", "question"],
                template="已知信息：\n{context}\n"
                         "简洁和专业的来回答用户的问题，在回答涉及数字的回复时，请用纯数字，若问题有要求小数点请遵守，增长率请列出公式和过程。如果无法从中得到答案，可以改写提问句子回复。答案请使用中文。 问题是：{question}."
            ),
            "prompt_financial": PromptTemplate(
                input_variables=["context", "question"],
                template="【任务要求】\n"
                         "请按照以下的步骤和要求，回答提问：\n"
                         "第一，读取并理解【背景知识】。\n"
                         "第二，财务指标的增长率【背景知识】里已算好，直接取即可。\n"
                         "第三，整理你找到或计算出的数据。若涉及数字，请用纯数字。\n"
                         "第四，若回答需要计算，请明确并简洁地给出计算步骤。\n"
                         "第五，遵守小数点的要求，确保答案精确性。\n"
                         "第六，用中文表述并回答问题。\n"
                         "第七，涉及比率，请用百分比% 。\n"
                         "第八，题目中出现是否相同，只能回答相同、不相同或者不确定。\n"
                         "【背景知识】\n"
                         "{context}\n"
                         "【提问】\n"
                         "{question}\n"
            ),
            "ner_prompt": PromptTemplate(
                input_variables=["question"],
                template="你需要扮演一个优秀的实体提取助手。你的任务是从问句中抽取并精确返回公司名称、年份和关键词，并以json的方式返回,缺少的信息可以不用返回，不用提示。\n"
                "问句：{question}\n"
            ),
            "basic_info": PromptTemplate(
                input_variables=["context", "question"],
                template="{context}\n"
                         "{question}\n"
            ),
            "qa_input": PromptTemplate(
                input_variables=["context", "question"],
                template=QA_PROMPT_V2,
            ),
            "qa_input_global": PromptTemplate(
                input_variables=["context", "question"],
                template=QA_PROMPT_V2_GLOBAL,
            ),
            "qa_system": PromptTemplate(
                input_variables=[],
                template="""你是一个AI问答机器人"""),
            "qa_system_normal": PromptTemplate(
                input_variables=[],
                template="You are a helpful assistant."),
            "qa_filter_system": PromptTemplate(
                input_variables=[],
                template="""你是一个问题相关度评判机器人,请判断问题是否与给出的哪些资料（包含表格Markdown和段落）相关。
评判步骤如下：
1. 请认真、仔细地过滤与问题无关的资料；
2. 按照资料相关性的得分从高到低排列，返回一个数字列表；
例子：
问题：该公司主要采用什么样的经营方式？
资料1：按照经营方式类型分类的工程总承包业务的收入、成本及毛利率构成情况
资料2：按照经营方式类型分类，工程总承包业务的净利润
资料3：这是一个无关的内容
回答：[1,2]

要求如下：
1. 请严格按照指定格式返回，返回编号列表
"""),
            "qa_filter_user": PromptTemplate(
                input_variables=[],
                template="""问题：{question}
{context}
回答：
"""),
        }

    def get_template(self, template_name):
        return self.templates.get(template_name, None)


template_manager = TemplateManager()
