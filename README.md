# AI Assist UI

## About

AI Assist UI is an open source chat-based user interface for interacting 
with plain AI models or our AI assistant backend [Query Cortex](https://github.com/journey2ai/query-cortex).

![AI Assist UI](./public/screenshots/screenshot-0402023.jpg)

## Deploy

**Docker**

Build locally:

```shell
docker build -t ai-assist-ui .
docker run -e OPENAI_API_KEY=xxxxxxxx -p 3000:3000 ai-assist-ui
```

## Running Locally

**1. Clone Repo**

```bash
git clone https://github.com/journey2ai/query-cortex.git
```

**2. Install Dependencies**

```bash
npm i
```

**3. Provide OpenAI API Key**

Create a .env.local file in the root of the repo with your OpenAI API Key:

```bash
OPENAI_API_KEY=YOUR_KEY
```

> You can set `OPENAI_API_HOST` where access to the official OpenAI host 
> is restricted or unavailable, allowing users to configure an alternative 
> host for their specific needs.

> Additionally, if you have multiple OpenAI Organizations, you can set 
> `OPENAI_ORGANIZATION` to specify one.

**4. Run App**

```bash
npm run dev
```

**5. Use It**

You should be able to start chatting.

## Configuration

When deploying the application, the following environment variables can be set:

| Environment Variable              | Default value                  | Description                                                                                                                               |
|-----------------------------------|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| OPENAI_API_KEY                    |                                | The default API key used for authentication with OpenAI                                                                                   |
| OPENAI_API_HOST                   | `https://api.openai.com`       | The base url, for Azure use `https://<endpoint>.openai.azure.com`                                                                         |
| OPENAI_API_TYPE                   | `openai`                       | The API type, options are `openai` or `azure`                                                                                             |
| OPENAI_API_VERSION                | `2023-03-15-preview`           | Only applicable for Azure OpenAI                                                                                                          |
| AZURE_DEPLOYMENT_ID               |                                | Needed when Azure OpenAI, Ref [Azure OpenAI API](https://learn.microsoft.com/zh-cn/azure/cognitive-services/openai/reference#completions) |
| OPENAI_ORGANIZATION               |                                | Your OpenAI organization ID                                                                                                               |
| DEFAULT_MODEL                     | `gpt-3.5-turbo`                | The default model to use on new conversations, for Azure use `gpt-35-turbo`                                                               |
| NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT | [see here](utils/app/const.ts) | The default system prompt to use on new conversations                                                                                     |
| NEXT_PUBLIC_DEFAULT_TEMPERATURE   | 1                              | The default temperature to use on new conversations                                                                                       |

If you do not provide an OpenAI API key with `OPENAI_API_KEY`, 
users will have to provide their own key.

## Contact

If you have any questions, feel free to reach out to
us via [hello@logsight.ai](mailto:hello@logsight.ai)