'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-06 15:12:45
LastEditors: longsion
LastEditTime: 2024-10-16 14:13:04
'''
from pkg.exceptions import LLMComplianceError
from pkg.utils import group_by_func
from pkg.personal.objects import Context
from pkg.es.es_p_doc_table import PDocTableModel
from pkg.es.es_p_file import PESFileObject
from pkg.llm.llm import LLM
from pkg.llm.template_manager import TemplateManager
from pkg.utils.logger import logger
from pkg.utils.decorators import register_span_func
from pkg.config import config

llm = LLM()


def func_span(context: Context):

    return dict(
        params=context.params.model_dump(),
        llm_question=context.llm_question,
        prompt_length=len(context.llm_question),
        llm_model=config["llm"]["model"],
        model_config=config[config["llm"]["model"]],
        llm_answer=context.llm_answer,
        answer_length=len(context.llm_answer) if context.llm_answer else 0,
    )


@register_span_func(func_name="LLM问答", span_export_func=func_span)
def generation(context: Context) -> Context:
    """
    生成
    """
    # 生成context
    _context = generate_context(context)

    prompt_temp = TemplateManager().get_template("qa_input")
    context.llm_question = prompt_temp.format(question=context.question_analysis.rewrite_question, context=_context)

    try:
        answer_or_iterator = llm.chat(context.llm_question, stream=context.params.stream)
    except LLMComplianceError:
        answer_or_iterator = config["compliance"]["warning_text"]
        context.answer_compliance = False

    if isinstance(answer_or_iterator, str):
        context.llm_answer = answer_or_iterator
    else:
        context.stream_iter = answer_or_iterator

    logger.info(f"Statistics , question_len: {len(context.llm_question)}, answer_len: {len(context.llm_answer or '')}")

    return context


def generate_context(context: Context):
    """
    生成prompt
    """
    # 按照文件进行group
    max_length = int(config["retrieve"]["retrieval_max_length"])
    _context = ""

    file_uuid_mapper = {file.uuid: file for file in context.locationfiles}
    if len(context.locationfiles) <= 10:
        each_length = max_length // len(context.locationfiles)
    else:
        each_length = max_length
    for ind, (file_uuid, r_contexts) in enumerate(group_by_func(context.rerank_retrieve_before_qa, lambda x: x.file_uuid)):
        file_entity: PESFileObject = file_uuid_mapper.get(file_uuid)
        if file_entity:
            _context += "# 来源文档\n"
            _context += file_entity.get_file_desc_md(context.company_mapper)

        each_contexts = ''
        for r_context in r_contexts:
            r_llm_text = r_context.tree_text
            if isinstance(r_context.origin, PDocTableModel):
                # 表名 + 表内容
                each_contexts += r_context.origin.title + "：\n" + r_llm_text + "\n\n"
            else:
                # 标题 + 段落
                each_contexts += r_llm_text + "\n\n"
        _context += each_contexts[: each_length]

    # max_length = int(config["retrieve"]["retrieval_max_length"])
    # _context = _context[:max_length]

    return _context
