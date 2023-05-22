#!/bin/bash

# 检查3000端口的进程
pid=$(netstat -tunlp 2>/dev/null | grep :3000 | awk '{print $7}' | cut -d"/" -f1)

if [ ! -z "$pid" ]
then
    echo "Killing process on port 3000 with PID: $pid"
    kill -9 $pid
else
    echo "No process running on port 3000"
fi

# 杀掉node进程
echo "Killing node processes"
pkill -f "/root/.nvm/versions/node/v16.20.0/bin/node"

# 运行yarn命令
echo "Running yarn build"
yarn run build

# 等待yarn build完成
wait

# 执行yarn start并将日志输出到log.txt
echo "Running yarn start"
nohup yarn run start > log.txt 2>&1 &
