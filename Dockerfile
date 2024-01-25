# 使用指定版本的 Node.js 官方镜像作为基础镜像
FROM node:20.11.0

# 设置工作目录
WORKDIR /usr/src/app

# 将 package.json 和 package-lock.json 文件复制到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 将项目源代码复制到工作目录
COPY . .

# 编译 TypeScript 代码
RUN npm run build

# 暴露 33966 端口
EXPOSE 33966

# 运行项目
CMD [ "npm", "start" ]