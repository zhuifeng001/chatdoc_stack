import json
from math import inf
import os
import time
from pydantic import BaseModel
import requests

from pkg.doc.md2tree import TreeBuild, detail_process, tree_generate
from pkg.storage import Storage
from pkg.utils import compress, retry_exponential_backoff, xjson
from pkg.utils.decorators import register_span_func

from pkg.doc.objects import Context, DocTree, FileProcessException
from pkg.config import BASE_DIR, config
from pkg.doc.doc_parse import local_or_remote_exist as local_or_remote_exist_doc_parse, upload_doc_parser
from pkg.doc.catalog import local_or_remote_exist as local_or_remote_exist_catalog, upload_catalog
from pkg.utils.thread_with_return_value import ThreadWithReturnValue
from pkg.clients.textin_ocr import TextinOcr
from pkg.utils.logger import logger


class FileImage(BaseModel):
    filename: str
    image_id: str


@register_span_func(func_name="文档解析", span_export_func=lambda context: context.model_dump(
    include=[
        "params",
        "trace_id",
        "org_file_path",
        "doc_parse_path"
    ]
))
def parse_document_new(context: Context) -> Context:
    context.doc_parse_path = config["location"]["base_doc_parse_path"].format(BASE_DIR=BASE_DIR) % context.params.uuid
    context.catalog_path = config["location"]["base_catalog_path"].format(BASE_DIR=BASE_DIR) % context.params.uuid
    context.catalog_path_frontend = config["location"]["base_frontend_catalog_path"].format(BASE_DIR=BASE_DIR) % context.params.uuid

    if not context.params.force_doc_parse and local_or_remote_exist_doc_parse(context.doc_parse_path) and local_or_remote_exist_catalog(context.catalog_path):
        # 不需要 doc parse 结果数据
        # with open(context.doc_parse_path, "r", encoding="utf-8") as f:
        #     context.doc_parse_result = json.load(f)

        with open(context.catalog_path, "r", encoding="utf-8") as f:
            context.doc_tree = DocTree.model_validate(json.load(f))
    else:
        request_parser(context)

    return context


@retry_exponential_backoff()
def request_parser(context: Context):
    """
    调用pdf2md的解析函数
    :param pdf_file_path: 需要解析的文件路径地址
    :return: 解析的json结果
    """
    filepath = context.org_file_path
    with open(filepath, 'rb') as f:
        data = f.read()
    st = time.time()
    response = TextinOcr().recognize_pdf2md(image=data)
    response.raise_for_status()
    res_json_all = xjson.loads(response.content)
    if res_json_all["code"] != 200:
        raise FileProcessException(f"pdf2md parse error: {res_json_all}")

    context.file_meta.page_number = len(res_json_all["metrics"])
    logger.info(f'pdf2md cost: {1000*(time.time() - st):.1f}ms, page_num: {context.file_meta.page_number}')
    handle_doc_parse(context=context, res_json_all=res_json_all)
    handle_catalog(context=context, res_json_all=res_json_all)


def find_bounding_rectangle(rectangles):
    # 初始化边界值为无穷大或无穷小
    min_x = inf
    min_y = inf
    max_x = -inf
    max_y = -inf

    # 遍历每个矩形
    for rect in rectangles:
        # 每个矩形的坐标是按顺序排列的
        x1, y1, x2, y2 = rect[0], rect[1], rect[4], rect[5]

        # 更新边界值
        min_x = min(min_x, x1, x2)
        min_y = min(min_y, y1, y2)
        max_x = max(max_x, x1, x2)
        max_y = max(max_y, y1, y2)

    return [min_x, min_y, max_x, min_y, max_x, max_y, min_x, max_y]


def handle_doc_parse(context: Context, res_json_all):
    doc_parser_res = res_json_all['result']
    metrics = res_json_all["metrics"]
    pages = doc_parser_res['pages']
    md_detail = doc_parser_res['detail']

    # file_imgs: list[FileImage] = []

    for page in pages:
        # 更新 structure的位置信息, 为所有content坐标的最大外接矩
        contents = page.get("content", [])
        for structured in page.get("structured", []):
            content_positions = [
                contents[content_id]["pos"] for content_id in structured.get("content", []) if isinstance(content_id, int)
            ]
            if content_positions and structured.get("type") == "textblock":
                structured["pos"] = find_bounding_rectangle(content_positions)

    if metrics and metrics[0].get("image_id"):
        context.file_meta.first_image_id = metrics[0]["image_id"]
    else:
        logger.warning("metrics has not image, file_meta first image Empty!!!")

    doc_result_json = xjson.dumps(dict(result=dict(
        pages=[dict(content=[_content for _content in x["content"] if _content["type"] != "image"]) for x in pages],
        metrics=metrics,
        detail=md_detail,
        engine="pdf2md",
        version=res_json_all.get("version")
    )))

    upload_doc_parse_thread = ThreadWithReturnValue(target=upload_doc_parser, args=(doc_result_json, context.doc_parse_path))
    upload_doc_parse_thread.start()
    context.threads.append(upload_doc_parse_thread)

    upload_brief_thread = ThreadWithReturnValue(target=upload_brief, args=(metrics, context.params.uuid))
    upload_brief_thread.start()
    context.threads.append(upload_brief_thread)

    # 异步上传文件图片【异步去做，不需要加入到context.threads当中】
    upload_imgs_thread = ThreadWithReturnValue(target=upload_imgs, args=(metrics, context.params.uuid))
    upload_imgs_thread.start()


def handle_catalog(context: Context, res_json_all):
    md_detail = res_json_all["result"]["detail"]
    new_detail = detail_process(md_detail, keep_hierarchy=True)
    tree = TreeBuild(new_detail)

    context.doc_tree = DocTree(tree=[tree], generate=tree_generate(tree))

    upload_catalog_thread = ThreadWithReturnValue(target=upload_catalog, args=(context.doc_tree.model_dump_json(include=["generate"]), context.catalog_path_frontend))
    upload_catalog_thread.start()
    context.threads.append(upload_catalog_thread)

    upload_catalog_backend_thread = ThreadWithReturnValue(target=upload_catalog, args=(context.doc_tree.model_dump_json(), context.catalog_path))
    upload_catalog_backend_thread.start()
    context.threads.append(upload_catalog_backend_thread)


def upload_imgs(metrics: list, uuid: str):
    # 后台线程，调用proxy去backupImage
    pics = [
        dict(
            dpi=page.get("dpi", None),
            angle=page.get("angle", 0),
            image_id=page.get("image_id", ""),
            image_url="",
            height=page["page_image_height"],
            width=page["page_image_width"],
            index=i,
        )
        for i, page in enumerate(metrics)
    ]
    body = dict(
        uuid=uuid,
        pics=pics,
    )
    proxy_url = config["proxy"]["url"]
    resp_body = requests.post(f"{proxy_url}/backup/images", json=body).json()
    if resp_body and "pics" in resp_body:
        brief_info = dict(pics=resp_body["pics"])
        content = json.dumps(brief_info, ensure_ascii=False)
        Storage.upload(f"brief-{uuid}.gz", compress(content))
        logger.info(f"Backend Backup Image Success: {uuid}, {len(resp_body['pics'])}")

    else:
        logger.error(f"Backend Backup Image Failed: {uuid}")


def upload_brief(metrics: list, uuid: str):
    pics = [
        dict(
            dpi=page.get("dpi", None),
            angle=page.get("angle", 0),
            image_id=page.get("image_id", ""),
            image_url="",
            height=page["page_image_height"],
            width=page["page_image_width"],
        )
        for page in metrics
    ]

    brief_info = dict(pics=pics)
    content = json.dumps(brief_info, ensure_ascii=False)
    Storage.upload(f"brief-{uuid}.gz", compress(content))


if __name__ == '__main__':
    os.chdir(os.path.dirname(__file__))
