# IntFinQ-ChatDoc-Proxy

## 项目简介

基于 python + fastapi 开发的 [IntFinQ](https://intfinq.textin.com/) 知识库问答业务层后端支持项目

实现的功能

1. 批量对文本进行向量化，并保存到向量库中，支持tencent|zilliz|es，默认存入到es中
2. 批量备份文档图片到本地/cos存储中，默认本地
3. 代理ES搜索服务，提升ES服务性能；
4. 代理文档图片上传下载功能；

以上功能，都可以在 TextIn.com 上体验使用，👉 [体验地址](https://intfinq.textin.com/)

## 项目运行

1. python 版本要求`python >= 3.9`
2. 依赖安装`pip install -r requirements.txt`
3. 修改配置文件`config.yaml`，配置`es`、`llm`、`textin`等信息
4. 启动`PYTHONPATH=./ python app/main.py`

## docker 运行

```
docker run -d -p 3001:3001 
    -e ES_HOSTS=http://es01:9200|http://es02:9200|http://es03:9200
    -e ES_USERNAME=elastic
    -e ES_PASSWORD=Pwd_250309
    -e DATA_PATH=/data
    -e BASE_PATH=/app/config.yaml
    -e LOCATION_BASE_FILE_PATH=/data/file/
    -e ANALYST_QUERY_ANALYSIS_URL=http://query-analysis:30006/query_analysis
    -e LLM_MODEL=tyqwapi
    -e TYQWAPI_MODEL=deepseek-v3
    -e TYQWAPI_API_KEY=sk-998xxxx
    -e TEXTIN_APP_ID=xxxxx
    -e TEXTIN_APP_SECRET=xxxxx
    intfinq-chatdoc-proxy
```


## 环境变量

| 变量   | 描述                                    |
| ------ | --------------------------------------- |
| ES_HOSTS | es集群地址，如：http://es01:9200|http://es02:9200|http://es03:9200 |
| ES_USERNAME | es用户名，如：elastic |
| ES_PASSWORD | es密码，如：Pwd_250309 |
| DATA_PATH | 数据存储路径，如：/data |
| BASE_PATH | 配置文件路径，如：/app/config.yaml |
| LOCATION_BASE_FILE_PATH | 文件存储路径，如：/data/file/ |
| ANALYST_QUERY_ANALYSIS_URL | 问题解析地址，如：http://query-analysis:30006/query_analysis |
| LLM_MODEL | 模型类型，如：tyqwapi |
| TYQWAPI_MODEL | 模型类型，如：deepseek-v3 |
| TYQWAPI_API_KEY | 模型api key，如：sk-998xxxx |
| TEXTIN_APP_ID | textin app id，如：xxxxx |
| TEXTIN_APP_SECRET | textin app secret，如：xxxxx |
