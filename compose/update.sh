#!/bin/bash

if [ $# -eq 0 ] ; then 
    echo '必须要指定一个服务的名称.'
    exit 1
fi

docker-compose up -d --no-deps --build $1

