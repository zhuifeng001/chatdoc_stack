# IntFinQ-Backend

## 项目简介

基于 node + nestjs 开发的 [IntFinQ](https://intfinq.textin.com/) 知识库问答后端项目

实现的功能

1. 用户 + 登录 (初始账号密码 admin/admin)
2. 知识库文档管理
3. 提问 + 问答记录

以上功能，都可以在 TextIn.com 上体验使用，👉 [体验地址](https://intfinq.textin.com/)

## 项目运行

1. node 版本要求`node >= 18`，mysql 版本 `mysql 8`
2. 依赖安装`yarn install`
3. 启动`yarn start:dev`

表结构初始化脚本 `migrations/init.sql`

api 文档地址 http://localhost:3000/api

## docker 运行

```sh
docker run \
  -p 3000:3000 \
  -e MYSQL_HOST=ip \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USERNAME=root \
  -e MYSQL_PASSWORD=root \
  -e MYSQL_DATABASE=gpt_qa \
  -e REDIS_HOST=ip \
  -e REDIS_PORT=10001 \
  -e REDIS_USERNAME=root \
  -e REDIS_PASSWORD=root \
  -e UPLOAD_ADDRESS=http://ip/ \
  -e DOWNLOAD_ADDRESS=http://ip/ \
  -e TEXTIN_DOWNLOAD_URL=https://api.textin.com/ocr_image/download \
  -e TEXTIN_APP_ID=xxxx \
  -e TEXTIN_APP_SECRET=xxxx \
  -e BACKEND_NODE_URL=http://ip:3000 \
  -e BACKEND_URL=http://ip:5000 \
  -e CHATDOC_PROXY_URL=http://ip:8000 \
  -d intfiq-backend
```

## 环境变量

| 变量                                                               | 描述                      |
| ------------------------------------------------------------------ | ------------------------- |
| MYSQL_HOST/MYSQL_PORT/MYSQL_USERNAME/MYSQL_PASSWORD/MYSQL_DATABASE | mysql 数据库              |
| REDIS_HOST/REDIS_PORT/REDIS_USERNAME/REDIS_PASSWORD                | redis                     |
| UPLOAD_ADDRESS/DOWNLOAD_ADDRESS                                    | 文件服务                  |
| TEXTIN_DOWNLOAD_URL/TEXTIN_APP_ID/TEXTIN_APP_SECRET                | textin 平台 app id/secret |
| BACKEND_NODE_URL                                                   | 当前服务 URL              |
| BACKEND_URL                                                        | 依赖的服务                |
| CHATDOC_PROXY_URL                                                  | 依赖的服务                |
