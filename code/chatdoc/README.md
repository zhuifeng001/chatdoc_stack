# IntFinQ-ChatDoc

## 项目简介

基于 python + flask 开发的 [IntFinQ](https://intfinq.textin.com/) 知识库问答业务层后端项目

实现的功能

1. 个人知识库文档上传，文档解析，切片，向量化，构建知识库
2. 选择文件（可选择多个文件）后进行提问
3. 对个人知识库进行全局提问

以上功能，都可以在 TextIn.com 上体验使用，👉 [体验地址](https://intfinq.textin.com/)

## 项目运行

1. python 版本要求`python >= 3.9`
2. 依赖安装`pip install -r requirements.txt`
3. 修改配置文件`config.yaml`，配置`es`、`redis`、`llm`、`textin`等信息
4. 启动`python main.py`

## docker 运行

```
docker run -d -p 3001:3001 
    -e REDIS_HOST=redis
    -e REDIS_PORT=6379
    -e REDIS_DB=7
    -e REDIS_PASSWORD=Pwd_250309
    -e ES_HOSTS=http://es01:9200|http://es02:9200|http://es03:9200
    -e ES_USERNAME=elastic
    -e ES_PASSWORD=Pwd_250309
    -e DATA_PATH=/data
    -e BASE_PATH=/app/config.yaml
    -e LOCATION_BASE_FILE_PATH=/data/file/
    -e BACKEND_PARSE_STATUS=http://backend:3000/api/v1/document/callback
    -e INFER_QUESTION_KEYWORD_URL=http://query-analysis:30006/query_analysis
    -e PDF2MD_URL=https://api.textin.com/ai/service/v1/pdf_to_markdown
    -e LLM_MODEL=tyqwapi
    -e TYQWAPI_MODEL=deepseek-v3
    -e TYQWAPI_API_KEY=sk-998xxxx
    -e TEXTIN_APP_ID=xxxxx
    -e TEXTIN_APP_SECRET=xxxxx
    intfinq-chatdoc
```


## 环境变量

| 变量   | 描述                                    |
| ------ | --------------------------------------- |
| REDIS_HOST | redis地址，如：redis |
| REDIS_PORT | redis端口，如：6379 |
| REDIS_DB | redis数据库，如：7 |
| REDIS_PASSWORD | redis密码，如：Pwd_250309 |
| ES_HOSTS | es集群地址，如：http://es01:9200|http://es02:9200|http://es03:9200 |
| ES_USERNAME | es用户名，如：elastic |
| ES_PASSWORD | es密码，如：Pwd_250309 |
| DATA_PATH | 数据存储路径，如：/data |
| BASE_PATH | 配置文件路径，如：/app/config.yaml |
| LOCATION_BASE_FILE_PATH | 文件存储路径，如：/data/file/ |
| INFER_QUESTION_KEYWORD_URL | 问题解析地址，如：http://query-analysis:30006/query_analysis |
| LLM_MODEL | 模型类型，如：tyqwapi |
| TYQWAPI_MODEL | 模型类型，如：deepseek-v3 |
| TYQWAPI_API_KEY | 模型api key，如：sk-998xxxx |
| TEXTIN_APP_ID | textin app id，如：xxxxx |
| TEXTIN_APP_SECRET | textin app secret，如：xxxxx |
| PDF2MD_URL | pdf转markdown地址，如：https://api.textin.com/ai/service/v1/pdf_to_markdown |