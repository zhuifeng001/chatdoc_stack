#!/bin/bash
#  设置 es 参数: sysctl -w vm.max_map_count=262144

# 设置存储镜像文件的路径
MYSQL_PATH="../initialize/mysql"  # 存储 SQL 文件的路径
SAMPLES_PATH="../initialize/samples"  # 存储样本文件的路径
IMAGE_PATH="../initialize/images"  # 镜像路径
LOCAL_STORE_FILE="../.local-store-file"
SCHEMA_DIR="../initialize/es/schema"  # es 索引的schema 路径
ES_CONTAINER_NAME="es01"
MOUNT_DATA_DIR="../data"

# 使用 set -euo pipefail 提高脚本健壮性
set -euo pipefail


load_image() {
  echo "开始导入镜像..."
  # 查找所有匹配的 .tar 文件
  IMAGE_TAR_FILES=$(find "$IMAGE_PATH" -type f -name '*.tar')

  # 如果没有找到文件，打印错误并退出
  if [ -z "$IMAGE_TAR_FILES" ]; then
    echo "错误：未找到匹配的 .tar 文件"
    exit 1
  fi

  # 导入每个 tar 文件为 Docker 镜像
  echo "$IMAGE_TAR_FILES" | while read -r TAR_FILE; do
    echo "正在导入镜像：$TAR_FILE"

    # 使用 docker load 导入 tar 文件
    if docker load -i "$TAR_FILE"; then
      echo "镜像从 $TAR_FILE 导入成功"
    else
      echo "错误：镜像从 $TAR_FILE 导入失败"
      exit 1
    fi
  done
  echo "所有镜像已成功导入！"
}

# 定义 service_start 函数，用于启动  服务
service_start() {
  echo "开始初始化es路径权限..."
  # 确保路径存在
  mkdir -p ${MOUNT_DATA_DIR}/es/01
  mkdir -p ${MOUNT_DATA_DIR}/es/02
  mkdir -p ${MOUNT_DATA_DIR}/es/03
  
  # 权限设置
  chmod g+rwx ${MOUNT_DATA_DIR}/es/01
  chmod g+rwx ${MOUNT_DATA_DIR}/es/02
  chmod g+rwx ${MOUNT_DATA_DIR}/es/03

  # 检查当前用户是否是 root
  if [[ "$(id -u)" -eq 0 ]]; then
    # root 用户，直接执行命令
    echo "当前是 root 用户，正在执行命令..."
    # 组设置
    chgrp 0 ${MOUNT_DATA_DIR}/es/01
    chgrp 0 ${MOUNT_DATA_DIR}/es/02
    chgrp 0 ${MOUNT_DATA_DIR}/es/03

  else
    # 不是 root 用户，检查是否有 sudo 权限
    if touch /tmp/test.auth && sudo chgrp 0 /tmp/test.auth &>/dev/null; then
      echo "当前是普通用户，具有 sudo 权限，正在执行命令..."
      sudo chgrp 0 ${MOUNT_DATA_DIR}/es/01
      sudo chgrp 0 ${MOUNT_DATA_DIR}/es/02
      sudo chgrp 0 ${MOUNT_DATA_DIR}/es/03
    else
      echo "错误: 当前用户没有 sudo 权限， 无法修改文件夹权限， 需要将chgrp 命令添加到sudo 中。"
      exit 1
    fi
  fi

  echo "开始启动docker compose 的服务..."
  # 执行 start.sh 脚本
  if [ -f "start.sh" ]; then
    chmod +x start.sh
    bash start.sh
  else
    echo "错误：当前路径下不存在 start.sh 脚本"
    exit 1
  fi
  echo "docker compose 服务已启动..."
}

# 定义 init_mysql 函数，用于导入 SQL 文件到 MySQL 容器中
init_mysql() {
  echo "开始导入mysql 的数据..."
  # 检查 MySQL 容器是否正在运行
  MYSQL_CONTAINER=$(docker ps -q --filter "name=mysql")

  if [ -z "$MYSQL_CONTAINER" ]; then
    echo "错误：没有找到正在运行的 MySQL 容器"
    exit 1
  fi

  # 提示用户输入 MySQL 凭证

  echo "请输入 MySQL 地址（默认：127.0.0.1）："
  read -r MYSQL_HOST
  MYSQL_HOST=${MYSQL_HOST:-127.0.0.1}

  echo "请输入 MySQL 端口（默认：3306）："
  read -r MYSQL_PORT
  MYSQL_PORT=${MYSQL_PORT:-3306}

  echo "请输入 MySQL 用户名（默认：root）："
  read -r MYSQL_USER
  MYSQL_USER=${MYSQL_USER:-root}

  echo "请输入 MySQL 密码："
  read -rs MYSQL_PASSWORD
  MYSQL_PASSWORD=${MYSQL_PASSWORD:-Pwd_250309}

  # 检查 SQL 文件是否存在于指定的目录
  if [ ! -d "$MYSQL_PATH" ] || [ -z "$(ls $MYSQL_PATH/*.sql 2>/dev/null)" ]; then
    echo "错误：在 $MYSQL_PATH 找不到 SQL 文件"
    exit 1
  fi

  # 导入每个 SQL 文件到 MySQL 容器中
  echo "正在将 SQL 文件导入到 MySQL 容器..."

  for SQL_FILE in "$MYSQL_PATH"/*.sql; do
    echo "正在导入 $SQL_FILE 到 MySQL..."
    docker exec -i "$MYSQL_CONTAINER" mysql --default-character-set=utf8mb4 -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -P"$MYSQL_PORT" < "$SQL_FILE"

    if [ $? -eq 0 ]; then
      echo "成功导入 $SQL_FILE"
    else
      echo "错误：导入 $SQL_FILE 失败"
      continue
    fi
  done

  echo "所有 SQL 文件已成功导入！"
}


# 导入es的scheme
init_es() {
  # 提示用户输入 POST 的 IP 和 Port
  : ${LOCAL_ETH_IP:="127.0.0.1"}
  echo "请输入 ES 暴露的 IP 地址（默认：${LOCAL_ETH_IP:-127.0.0.1}）："
  read -r ES_IP
  ES_IP=${ES_IP:-${LOCAL_ETH_IP}}

  echo "请输入 ES 暴露的 端口（默认：9200）："
  read -r ES_PORT
  ES_PORT=${ES_PORT:-9200}

  # 遍历 es/schema 目录下的所有文件
  for schema_file in "$SCHEMA_DIR"/*.json; do
    if [[ -f "$schema_file" ]]; then
      # 获取文件名作为索引名称
      INDEX_NAME=$(basename "$schema_file" .json)  # 假设文件是 JSON 格式，去掉扩展名
      echo "导入索引 $INDEX_NAME 的 schema... , 文件路径为 ${schema_file}"
      # 检查 Elasticsearch 容器是否存在
      if ! docker ps --filter "name=$ES_CONTAINER_NAME" --quiet; then
        echo "错误: 未找到名为 '$ES_CONTAINER_NAME' 的 Elasticsearch 容器!, 无法执行导入"
        exit 1
      fi
      # 读取文件内容并导入到 Elasticsearch
      schema_json_str=$(cat "$schema_file")
      docker exec -i "$ES_CONTAINER_NAME" curl -X PUT "${ES_IP}:${ES_PORT}/$INDEX_NAME?pretty" -H 'Content-Type: application/json' -d "${schema_json_str}"
      # 检查索引是否已成功创建
      CREATED_INDEX=$(docker exec -i "$ES_CONTAINER_NAME" curl -s "${ES_IP}:${ES_PORT}/_cat/indices?h=index" | grep "^$INDEX_NAME$")
      if [[ -n "$CREATED_INDEX" ]]; then
        echo "索引 $INDEX_NAME 已成功创建并存在于索引列表中！"
      else
        echo "错误: 索引 $INDEX_NAME 创建失败或未出现在索引列表中！"
        exit 1
      fi
    fi
  done
}


# 检查当前路径下是否有.env文件
check_env_template() {
  if [ ! -f ".env" ]; then
    echo "当前路径下的环境变量不存在， 请到项目根目录下执行bash install.sh config 命令来初始化.env文件"
  fi

  set_sys_var
}



# 检查输入参数并调用相应的函数
if [ -z "${1:-}" ]; then
  echo "错误：未提供必要的参数。请使用以下命令之一："
  echo "用法：$0 {load-image|compose-start|init-mysql|init-es|import-samples}"
  exit 1
fi



# 检查输入参数并调用相应的函数
case "$1" in
  load-image)
    load_image  # 执行导入镜像的函数
    ;;
  compose-start)
    service_start  # 执行启动 Compose 项目的函数
    ;;
  init-mysql)
    init_mysql  # 执行初始化 MySQL 的函数
    ;;
  init-es)
    init_es  # 执行导入es scheme 等操作
    ;;
  all)
    # load_image
    service_start
    echo "20s 初始化ES及MYSQL"
    sleep 20
    init_es
    init_mysql
    ;;
  *)
    echo "用法：$0 {load-image|compose-start|init-mysql|init-es}"  # 使用方法：$0 {load-image|compose-start|init-mysql}
    exit 1
    ;;
esac