#!/bin/bash

# 进入到脚本所在的目录
cd "$(dirname "$0")"

# 检查是否提供了 docker-compose 配置文件路径，如果没有则使用默认路径
DOCKER_COMPOSE_FILE="./docker-compose.yml"
if [ ! -z "$1" ]; then
  DOCKER_COMPOSE_FILE="$1"
fi

# 检查 Docker Compose 是否已经启动
echo "正在检查 Docker Compose 服务是否正在运行..."

# 检查是否有正在运行的容器
RUNNING_CONTAINERS=$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q)

if [ -n "$RUNNING_CONTAINERS" ]; then
  echo "Docker Compose 服务正在运行，正在停止它们..."
  # 停止服务
  docker-compose -f "$DOCKER_COMPOSE_FILE" down
  echo "服务已成功停止！"
else
  echo "未找到正在运行的 Docker Compose 服务。"
fi