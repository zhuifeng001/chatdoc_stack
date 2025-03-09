#!/bin/bash

# 输出帮助信息的函数
function show_help {
  echo "使用方法: $0 [OPTIONS] [SERVICES...]"
  echo ""
  echo "OPTIONS:"
  echo "  --help              显示此帮助信息"
  echo "  [SERVICES...]       指定要启动或重启的 Docker 服务，如果未提供服务名称，则启动所有服务"
  echo "  [YML_FILE]          可选的 docker-compose 配置文件路径，默认为 ./docker-compose.yml"
  echo ""
  echo "示例:"
  echo "  $0                  启动所有服务"
  echo "  $0 my_service       启动指定服务"
  echo "  $0 my-docker-compose.yml my_service  启动指定服务，使用自定义的配置文件"
  echo "  $0 --help           显示帮助信息"
}

# 如果传入 --help 参数，则显示帮助信息并退出
if [[ "$1" == "--help" ]]; then
  show_help
  exit 0
fi

# 进入到脚本所在的目录
cd "$(dirname "$0")"

# 默认的 docker-compose 配置文件
DOCKER_COMPOSE_FILE="./docker-compose.yml"

# 检查是否提供了 docker-compose 配置文件路径
if [[ ! -z "$1" && "$1" == *.yml ]]; then
  DOCKER_COMPOSE_FILE="$1"
  shift  # 移除第一个参数（配置文件路径）
fi

# 获取要启动的服务（如果有）
SERVICES="$@"

# 检查 Docker Compose 是否已经启动
echo "正在检查 Docker Compose 服务是否正在运行..."

# 检查是否有正在运行的容器
RUNNING_CONTAINERS=$(docker-compose ps -q $SERVICES)

# 如果未找到正在运行的容器，启动服务
if [ -z "$RUNNING_CONTAINERS" ]; then
  if [ -z "$SERVICES" ]; then
    echo "未找到正在运行的 Docker Compose 服务，正在启动所有服务..."
    docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d
  else
    echo "未找到正在运行的服务：$SERVICES，正在启动指定服务..."
    docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d ${SERVICES}
  fi

  # 循环检查服务状态，最多 6 次，每次间隔 10 秒
  MAX_RETRIES=6
  RETRY_INTERVAL=10
  for ((i=1; i<=$MAX_RETRIES; i++)); do
    echo "等待服务启动... ($i/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL

    # 检查服务是否运行
    RUNNING_CONTAINERS=$(docker-compose -f "${DOCKER_COMPOSE_FILE}" ps -q ${SERVICES})

    if [ -z "$RUNNING_CONTAINERS" ]; then
      echo "错误：服务启动失败，未找到正在运行的容器。"
      exit 1
    fi

    # 检查所有容器是否正常运行
    ALL_RUNNING=true
    for CONTAINER in $RUNNING_CONTAINERS; do
      CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' $CONTAINER)
      if [[ "$CONTAINER_STATUS" != "running" ]]; then
        ALL_RUNNING=false
        echo "容器 $CONTAINER 状态异常：$CONTAINER_STATUS"
      fi
    done

    if $ALL_RUNNING; then
      echo "服务已成功启动！"
      exit 0
    fi
  done

  echo "错误：服务启动失败，部分容器未正常运行。"
  exit 1
else
  echo "Docker Compose 服务正在运行，正在进行重启..."

  if [ -z "${SERVICES}" ]; then
    docker-compose -f "${DOCKER_COMPOSE_FILE}" down && docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d
  else
    docker-compose -f "${DOCKER_COMPOSE_FILE}" pull && docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d --no-deps ${SERVICES}
  fi

  echo "服务已成功重启！"
fi