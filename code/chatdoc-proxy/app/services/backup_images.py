'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-09-26 19:08:45
LastEditors: longsion
LastEditTime: 2025-03-09 08:14:33
'''


from typing import Optional
from pydantic import BaseModel
import requests
import tenacity
from app.config import config
from app.utils.logger import log_msg, logger
from app.utils.storage import Storage, compress
import pypeln as pl

import base64
from io import BytesIO
from PIL import Image

UPLOAD_IMG_PARALLELS = int(config["textin"]['parallels'])


class PicObject(BaseModel):
    dpi: Optional[int] = None
    angle: int = 0
    image_url: str = ""
    image_id: str = ""
    height: int
    width: int
    index: int


class BackupImageObject(BaseModel):
    user_id: str = None
    uuid: str
    pics: list[PicObject]


@log_msg
def backup_file_images(backup_image: BackupImageObject):
    backup_image.pics | pl.thread.map(lambda x: backup_img(x, backup_image.uuid, backup_image.user_id), workers=UPLOAD_IMG_PARALLELS, maxsize=UPLOAD_IMG_PARALLELS) | list


def convert_base64_to_webp(base64_stream):
    # 将字节加载为图像文件
    image = Image.open(BytesIO(base64_stream))

    # 创建一个内存中的输出流
    output_buffer = BytesIO()

    # 将图像保存为WebP格式到内存中的输出流
    image.save(output_buffer, format="WEBP")

    # 获取内存中输出流的内容
    webp_data = output_buffer.getvalue()

    return webp_data

    # 将WebP字节数据转换为Base64编码的字符串
    # webp_stream = base64.b64encode(webp_data)

    # return webp_stream


def backup_img(pic: PicObject, uuid: str, user_id: str):
    index = pic.index
    if not pic.image_id:
        return pic
    try:
        file_img_base64 = download_textin_img(pic.image_id)
    except Exception as e:
        logger.error(f"download textin image {pic.image_id} error: {e}")
        return pic

    if user_id:
        image_filename = f"User_{user_id}/{uuid}_{index}.gz"
    else:
        image_filename = f"{uuid}_{index}.gz"

    try:
        file_img_stream = base64.b64decode(file_img_base64)
        webp_bytes = convert_base64_to_webp(file_img_stream)
        image_filename = f"User_{user_id}/{uuid}_{index}.webp" if user_id else f"{uuid}_{index}.webp"
        Storage.upload(image_filename, webp_bytes)
    except Exception as e:
        logger.error(f"convert_base64_to_webp image {pic.image_id} error: {e}")
        Storage.upload(image_filename, compress(file_img_base64))

    pic.image_url = image_filename  # image_url不需要再加一个User_X前缀了

    return pic


@tenacity.retry(wait=tenacity.wait_exponential(multiplier=1, min=5, max=15),
                stop=tenacity.stop_after_attempt(max_attempt_number=5),
                reraise=True)
def download_textin_img(image_id: str) -> str :
    headers = {"x-ti-app-id": config['textin']['app_id'], "x-ti-secret-code": config['textin']['app_secret']}
    download_img_url = config['textin']['download_url']
    res = requests.get(f'{download_img_url}?image_id={image_id}', data={'image_id': image_id} , headers=headers)
    res.raise_for_status()
    return res.json()['data']['image']
