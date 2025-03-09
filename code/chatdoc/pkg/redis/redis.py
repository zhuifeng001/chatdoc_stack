'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-09-11 18:34:44
LastEditors: longsion
LastEditTime: 2024-10-16 14:27:38
'''

import redis

from pkg.config import config
from pkg.utils.logger import logger


redis_store = redis.Redis(
    host=config["redis"]["host"],
    port=config["redis"]["port"],
    db=config["redis"]["db"],
    username=config["redis"].get("username"),  # 使用 get 方法安全地获取用户名
    password=config["redis"].get("password")   # 使用 get 方法安全地获取密码
)

# 测试连接
try:
    redis_store.ping()
    logger.info("Connected to Redis successfully.")
except redis.exceptions.ConnectionError as e:
    logger.error(f"Failed to connect to Redis: {e}")
