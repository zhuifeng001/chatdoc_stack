# chatdoc-stack

## 目录
- [项目简介](#项目简介)
- [快速开始](#安装)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 项目简介
### 💡chatdoc是什么？
chatdoc是一款基于[TextIn ParseX](https://www.textin.com/market/detail/pdf_to_markdown)解析服务构建的开源RAG(Retrieval-Augmented-Generation)引擎。支持解析多种文件格式，为企业和个人轻松打造知识库，通过结合知识检索与大语言模型(LLM)技术，提供可靠的知识问答以及答案溯源功能。

### 👉产品体验
请登陆网址(https://www.textin.com/product/textin_intfinq)

### ⭐️主要功能
- 基于[TextIn ParseX](https://www.textin.com/market/detail/pdf_to_markdown),提供通用文档解析服务，一个接口，支持PDF/Word(doc/docx)、常见图片(jpg/png/webp/tiff)、HTML等多种文件格式。一次请求，即可获取文字、表格、标题层级、公式、手写字符、图片信息
- 支持单文档、多文档、知识库全局问答
- 支持前端高亮展示检索原文

### 🚩[acge](https://www.textin.com/market/detail/acge_text_embedding)文本向量模型
- 自研文本向量模型[acge](https://www.textin.com/market/detail/acge_text_embedding)，为检索精度提供保障
- 提供接口调用方式，本地无需显卡资源
- 本地部署调用请参考[此链接](https://github.com/intsig-textin/acge_text_embedding)

### 🌱文档目录树切片策略
- 文本、表格、标题分别处理，应对各类复杂场景
- 标题层级递归切片，保留文档内在逻辑结构的完整性
- small2big兼顾检索准确性与语义完整性，保证答案全面

### 🍱有理有据、减少幻觉
- 多路召回、融合排序等，丰富搜索信息
- 答案溯源，确保答案准确性

## 快速开始

### 环境准备

在开始之前，请确保您的系统已安装以下依赖：

- **Docker**：用于容器化部署。
- **Docker Compose**：用于管理多容器应用。
- **TextIn API Key 和 Secret Key**：用于调用TextIn的解析服务。可以从[TextIn工作台](https://www.textin.com/console/dashboard/setting)获取
- **通义千问 API Key**：用于调用通义千问的API。

### 步骤 1: 🔨︎克隆仓库

首先，将 `chatdoc_stack` 仓库克隆到本地：

```bash
git clone https://github.com/intsig-textin/chatdoc_stack.git
cd chatdoc_stack
```

### 步骤 2: 🔑︎配置 API Key

1. **TextIn API Key 和 Secret Key：**
- 登录[TextIn工作台](https://www.textin.com/console/dashboard/setting)，获取API Key和Secret Key
- 将API Key和Secret Key填入到`compose/docker-compose.yml`文件中相应位置，涉及到`chatdoc-proxy`、`chatdoc`、`backend`三个服务
  ```docker-compose.yml
    - TEXTIN_APP_ID=your_textin_app_id
    - TEXTIN_APP_SECRET=your_textin_app_secret
  ```

1. **通义千问 API Key：**
- 注册[通义千问](https://bailian.console.aliyun.com/)，获取千问api的key
- 将千问api的key填入到`compose/docker-compose.yml`文件中相应位置[chatdoc服务中]，涉及到`chatdoc-proxy`、`chatdoc`两个服务
  ```docker-compose.yml
    - TYQWAPI_API_KEY=your_tyqwan_api_key
  ```


### 步骤 3: 启动服务

1. **设置 Elasticsearch 路径权限：**
   - 运行以下命令以确保 Elasticsearch 的路径权限正确：
    ```
    sudo sysctl -w vm.max_map_count=262144
    ```

2. **启动服务：**
   - 运行以下命令启动服务：
    ```bash
    cd compose
    chmod +x initialize.sh
    ./initialize.sh
    ```
    - 如果需要跨机器访问，请修改 docker-compose.yml 文件中的 KB_API 地址为后端暴露的公网地址。
    - 初始化服务后，修改配置，运行命令 compose/start.sh 即可

### 步骤 4: 🔍︎访问服务

1. **访问前端**
   - 访问 http://localhost:48091 前端地址访问界面，使用默认用户名密码 admin/admin

2. **个人知识库上传文件测试**
   - 使用默认用户名密码 admin/admin 登录后，点击左侧菜单栏的“个人知识库”，上传文件进行测试
   - 如果需要排查日志，可以使用 docker logs 命令查询
    ```
    docker logs -f <container_name>
    ```

## 注意事项
- 除 `question-analysis`镜像外，您可以使用代码仓库中各模块的 `Dockerfile` 文件自行构建镜像。
- 如果需要跨机器访问，请修改 `docker-compose.yml` 文件中的 `frontend` 服务中的 `KB_API` 地址为后端暴露的公网地址。


## 贡献指南
欢迎贡献代码！在开始之前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 以了解贡献流程和指南。

## 许可证
此项目基于 [CC-NC License](LICENSE) 进行许可。