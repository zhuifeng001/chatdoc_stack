'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-14 11:33:12
LastEditors: longsion
LastEditTime: 2024-10-16 14:26:03
'''

import time

from pkg.personal_doc.pdf2md import parse_document_new
from .objects import FileProcessStatus, Params, Context, FileProcessException, Response
from .common import callback, callback_file_meta_keys
from .download_file import download_file
from .preprocess_doctree import preprocess_doctree
from .cut_table import cut_table_fragment
from .cut_paragraph import cut_paragraph_fragment
from .upload_paragraph import upload_paragragh_fragment
from .extract_file_meta import extract_file_meta

from pkg.utils.decorators import register_span_func
from pkg.utils import global_file_thread_pool
from pkg.es.es_p_file import PFileES, PESFileObject
from pkg.config import config

from pkg.utils.thread_with_return_value import ThreadWithReturnValue

from opentelemetry.trace import get_current_span
from opentelemetry import context as otel_context
import traceback
from pkg.utils.logger import logger


def thread_process(context: Context) -> Context:
    '''
    description: 文档处理，后台线程池处理
    return {*}
    '''

    start_time = time.time()
    logger.info(f"Doc Process Start, params: {context.params.model_dump_json()}")

    otel_context.attach(context.span_ctx)

    try:
        # 文档解析: 个人知识库仅调用pdf2md, TODO: 需要调用doc_parser的话再看，
        # Cover是否也需要更新？
        # 个人知识库只调用PDF2MD？防止Cover及Page图片可能会冲突！！！可以暂时这么去使用！后面需要加的话再添加相应的逻辑处理！
        context = parse_document_new(context)

        # 先回调一次 file_catalog_success，让node层去刷数据
        _t = ThreadWithReturnValue(target=callback, args=(context.params.callback_url, context.params.uuid, FileProcessStatus.file_catalog_success.value, context.file_meta, context.params, ))
        _t.start()
        context.threads.append(_t)

        # 目录树预处理
        # 1. 生成ori_id对于原文的映射，存入到es中
        # 2. 方便切片逻辑的数据获取，以及存储
        context = preprocess_doctree(context)

        # 表格切片处理
        context = cut_table_fragment(context)

        # 段落切片处理
        context = cut_paragraph_fragment(context)

        # 异步进行文件基础信息提取
        _t_extract_file_meta = ThreadWithReturnValue(target=extract_file_meta, args=(context,))
        _t_extract_file_meta.start()

        # 段落切片上报
        context = upload_paragragh_fragment(context)

        # 生成文件基础信息
        context = _t_extract_file_meta.join()

    except Exception as e:
        logger.error(f"Doc Process Failed, trace_id: {context.trace_id}, exception: {e}, traceback: {traceback.format_exc()}")
        callback(context.params.callback_url, context.params.uuid, FileProcessStatus.file_process_error.value, params=context.params)
        raise e

    # 等待后台线程执行完成
    thread_rets = []
    for thread in context.threads:
        try:
            thread_rets.append(thread.join())
        except Exception as e:
            logger.error(f"Doc Process Failed, trace_id: {context.trace_id}, exception: backend threads exception occurred: {thread.name}, exception: {e}")
            thread_rets.append(False)

    # 更新 es_file
    insert_file_bool = PFileES().insert_file(context.es_file_entity)

    # None和True表示成功，False|err表示失败
    if not insert_file_bool or [thread_ret for thread_ret in thread_rets if thread_ret not in [None, True]]:
        logger.error(f"Doc Process Failed, trace_id: {context.trace_id}, exception: backend threads exception occurred: {thread_rets}")
        callback(context.params.callback_url, context.params.uuid, FileProcessStatus.file_process_error.value, context.file_meta, params=context.params)
    else:
        # 回调文件处理状态：切片成功
        callback(context.params.callback_url, context.params.uuid, FileProcessStatus.file_cut_success.value, context.file_meta, context.params)
        # 清空后台线程
        context.threads = []

        logger.info(f"Doc Process Success, elapsed: {1000*(time.time() - start_time):.1f}ms")

    return context


def process(params: Params) -> Context:
    context = Context(params=params)

    context.trace_id = f"{get_current_span().context.trace_id:0x}"
    context.span_ctx = otel_context.get_current()

    file_entities = PFileES().get_by_file_uuids(params.user_id, [context.params.uuid], with_doc_fragments_json=False)
    if not params.force_doc_parse and file_entities and context.params.knowledge_id != file_entities[0].kownledge_id:
        # 如果文件是系统文件库中, 且修改的库非源库修改
        context = report_process_result(context, "exists", file_entity=file_entities[0])
    else:
        # download file
        context = download_file(context)
        # TODO: 使用消息队列
        if global_file_thread_pool._work_queue.qsize() >= config["threadpool"]["doc_process_queue_size"]:
            raise FileProcessException(message="当前文档处理队列已满，请稍后重试")

        # 存在相同文件
        if file_entities:
            same_file_meta = file_entities[0]
            context.file_meta.page_number = same_file_meta.page_number
            context.file_meta.first_image_id = same_file_meta.first_image_id

        global_file_thread_pool.submit(thread_process, context)
        context = report_process_result(context, "processing")

    return context


def process_sync(params: Params) -> Context:

    context = Context(params=params)

    context.trace_id = f"{get_current_span().context.trace_id:0x}"
    context.span_ctx = otel_context.get_current()

    file_entities = PFileES().get_by_file_uuids(params.user_id, [context.params.uuid], with_doc_fragments_json=False)
    if file_entities and context.params.knowledge_id != file_entities[0].kownledge_id:
        context = report_process_result(context, "exists")
    else:
        # download file
        context = download_file(context)
        context = thread_process(context)
        context = report_process_result(context, status="processing")

    return context


@register_span_func(span_export_func=lambda context: dict(
    params=context.params.model_dump(),
    response=context.answer_response.model_dump(),
))
def report_process_result(context: Context, status, file_entity: PESFileObject = None):
    file_meta = None
    if file_entity:
        file_meta = file_entity.model_dump(include=callback_file_meta_keys)
        file_meta['knowledge_id'] = context.params.knowledge_id
        file_meta['ori_type'] = context.params.ori_type

    context.answer_response = Response(trace_id=context.trace_id,
                                       status=status,
                                       file_meta=file_meta)
    return context
