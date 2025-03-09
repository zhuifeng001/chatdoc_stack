'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-09 20:18:27
LastEditors: longsion
LastEditTime: 2025-03-09 09:31:28
'''
from fastapi import FastAPI, Request
from app.controller.embedding_and_upload import embedding_and_upload, embedding_and_upload_personal
from app.services.pdf_to_word import pdf_to_word
from app.services.embedding import parallel_query
from app.services.es import global_es
from app.services.retrieve import Context, retrieve_small_by_document
from app.services.analyst import analyst_query
from app.services.backup_images import backup_file_images, BackupImageObject
from app.utils.transform import html2markdown
from app.objects.vector import TextWithoutVecEntity, PersonalTextWithoutVecEntity
from app.utils.logger import logger
from fastapi.responses import Response
from fastapi.exceptions import HTTPException
from app.utils.storage import Storage
import mimetypes
import traceback

app = FastAPI()


@app.post("/upload/{filename:path}")
async def upload_file(filename: str, request: Request):
    """
    上传文件接口

    Args:
        filename: 存储的文件名
        request: 原始请求对象
    """
    try:
        # 读取原始请求体内容
        content = await request.body()
        # 调用存储方法
        Storage.upload(filename, content)

        return {"message": "文件上传成功", "filename": filename}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


@app.get("/download/{filename:path}")
async def download_file(filename: str):
    """
    下载文件接口

    Args:
        filename: 要下载的文件名
    """
    try:
        content, error = Storage.download(filename, "")

        if error:
            raise HTTPException(status_code=404, detail=f"文件下载失败: {str(error)}")

        # 判断内容是不是图片
        if content.startswith(b'\xff\xd8'):
            content_type = 'image/jpeg'
        elif content.startswith(b'\x89PNG\r\n\x1a\n'):
            content_type = 'image/png'
        elif content.startswith(b'II*\x00') or content.startswith(b'MM\x00*'):
            content_type = 'image/tiff'
        else:
            # 推测文件的 MIME 类型
            content_type, _ = mimetypes.guess_type(filename)

        print(filename, "guess_type is", content_type)
        if not content_type:
            content_type = 'application/octet-stream'

        # 设置响应头
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }

        return Response(
            content=content,
            media_type=content_type,
            headers=headers
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件下载失败: {str(e)}")


@app.post("/embedding/test")
async def test(vector_params: list[TextWithoutVecEntity]):
    parallel_query([x.text for x in vector_params])
    return "ok"


@app.post("/vector/upload")
async def upload_vdb(vector_params: list[TextWithoutVecEntity]):
    embedding_and_upload(vector_params)
    return "ok"


@app.post("/vector/upload_personal")
async def upload_personal_vdb(vector_params: list[PersonalTextWithoutVecEntity]):
    embedding_and_upload_personal(vector_params)
    return "ok"


@app.post("/transform/html2markdown")
async def html_list_to_markdown(html_list: list[str]):
    return [
        html2markdown(html)
        for html in html_list
    ]


@app.post("/es_proxy/search")
async def es_proxy_search(body: dict):
    index, search_body = body.get("index"), body.get("search_body")
    return global_es.search(index, search_body)


@app.post("/retrieve/small")
async def retrieve_small(body: Context):
    try:
        resp = retrieve_small_by_document(body)
        return resp.model_dump()
    except Exception as e:
        logger.error(e)
        logger.error(traceback.format_exc())
        return {
            "error": str(e)
        }


@app.post("/backup/images")
async def backup_images(body: BackupImageObject):
    try:
        backup_file_images(body)
        return body
    except Exception as e:
        logger.error(e)
        logger.error(traceback.format_exc())
        return {
            "error": str(e)
        }


@app.post("/analyst/query")
async def analyst_query_api(body: dict):
    return analyst_query(body.get("input"))


@app.post("/pdf2word")
async def pdf2word(request: Request):
    file = await request.body()
    return pdf_to_word(file)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
