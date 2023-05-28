# 聊天机器人用户界面

聊天机器人用户界面（Chatbot UI）是一个为 AI 模型开发的开源聊天用户界面。

查看[演示](https://twitter.com/mckaywrigley/status/1640380021423603713?s=46&t=AowqkodyK6B4JccSOxSPew)。

![Chatbot UI](./public/screenshots/screenshot-0402023.jpg)

## 更新

聊天机器人用户界面将随着时间的推移而进行更新。

预期会有频繁的改进。

**接下来的计划：**

- [ ] 共享
- [ ] "机器人"

## 部署

**Vercel**

使用 Vercel 托管您自己的聊天机器人用户界面实时版本。

[![用 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmckaywrigley%2Fchatbot-ui)

**Docker**

本地构建：

```shell
docker build -t chatgpt-ui .
docker run -e OPENAI_API_KEY=xxxxxxxx -p 3000:3000 chatgpt-ui
```

从 ghcr 拉取：

```
docker run -e OPENAI_API_KEY=xxxxxxxx -p 3000:3000 ghcr.io/mckaywrigley/chatbot-ui:main
```

## 本地运行

**1. 克隆仓库**

```bash
git clone https://github.com/mckaywrigley/chatbot-ui.git
```

**2. 安装依赖**

```bash
npm i
```

**3. 提供 OpenAI API 密钥**

在仓库的根目录中创建一个 .env.local 文件，并在其中输入您的 OpenAI API 密钥：

```bash
OPENAI_API_KEY=YOUR_KEY
```

> 如果您无法访问官方的 OpenAI 主机，您可以设置 `OPENAI_API_HOST`，允许用户配置他们特定需求的替代主机。

> 此外，如果您有多个 OpenAI 组织，可以设置 `OPENAI_ORGANIZATION` 来指定其中一个。

**4. 运行应用程序**

```bash
npm run dev
```

**5. 使用它**

您应该能开始聊天了。

## 配置
| 环境变量                          | 默认值                          | 描述                                                                                                                                       |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| OPENAI_API_KEY                    |                                | 用于与 OpenAI 进行身份验证的默认 API 密钥                                                                                                   |
| OPENAI_API_HOST                   | `https://api.openai.com`       | 基础网址，对于 Azure 使用 `https://<endpoint>.openai.azure.com`                                                                             |
| OPENAI_API_TYPE                   | `openai`                       | API 类型，选项是 `openai` 或 `azure`                                                                                                       |
| OPENAI_API_VERSION                | `2023-03-15-preview`           | 仅适用于 Azure OpenAI                                                                                                                      |
| AZURE_DEPLOYMENT_ID               |                                | 使用 Azure OpenAI 时需要，参考 [Azure OpenAI API](https://learn.microsoft.com/zh-cn/azure/cognitive-services/openai/reference#completions) |
| OPENAI_ORGANIZATION               |                                | 您的 OpenAI 组织 ID                                                                                                                        |
| DEFAULT_MODEL                     | `gpt-3.5-turbo`                | 新对话默认使用的模型，对于 Azure 使用 `gpt-35-turbo`                                                                                       |
| NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT | [参见这里](utils/app/const.ts) | 新对话使用的默认系统提示                                                                                                                   |
| NEXT_PUBLIC_DEFAULT_TEMPERATURE   | 1                              | 新对话使用的默认温度                                                                                                                       |
| GOOGLE_API_KEY                    |                                | 参见 [自定义搜索 JSON API 文档][GCSE]                                                                                                      |
| GOOGLE_CSE_ID                     |                                | 参见 [自定义搜索 JSON API 文档][GCSE]                                                                                                      |

如果你没有提供 `OPENAI_API_KEY` 的 OpenAI API 密钥，用户将需要提供自己的密钥。

如果你还没有 OpenAI API 密钥，你可以在[这里](https://platform.openai.com/account/api-keys)获取。

## 联系

如果您有任何问题，欢迎在 [Twitter](https://twitter.com/mckaywrigley) 上联系 Mckay。

[GCSE]: https://developers.google.com/custom-search/v1/overview
