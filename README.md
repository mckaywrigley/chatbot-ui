# Chat Everywhere by [Explorator Labs](https://exploratorlabs.com)

[中文版](README-zh.md)

Our goal is to promote awareness of AI technologies like ChatGPT, making them accessible to everyone and everywhere on Earth. Currently, the official ChatGPT is not available in certain countries without a VPN (e.g. China, HK, Macao, etc). Until official support is provided, we need an alternative to access groundbreaking technologies like this.

## Technological Background
This project is forked from [Chatbot UI](https://github.com/mckaywrigley/chatbot-ui), an initiative started by [Mckay](https://twitter.com/mckaywrigley) to build a better and open-source user interface compared to the official one.

## Funding for This Project
To lower the barrier to accessing technology like ChatGPT, [Explorator Labs](https://exploratorlabs.com) is pledging a fixed budget every month to make this project available for everyone without the need to log in or pay.

However, if the cost of OpenAI's API exceeds our set budget, we will evaluate options to cover the costs while maintaining accessibility and affordability. Further announcements will be made as needed.

## Development

**1. Clone Repo**

```bash
git clone https://github.com/exploratortech/chat-everywhere
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

> You can set `OPENAI_API_HOST` where access to the official OpenAI host is restricted or unavailable, allowing users to configure an alternative host for their specific needs.

> Additionally, if you have multiple OpenAI Organizations, you can set `OPENAI_ORGANIZATION` to specify one.

**4. Run App**

```bash
npm run dev
```

**5. Use It**

You should be able to start chatting.

## Configuration

When deploying the application, the following environment variables can be set:

| Environment Variable  | Default value                  | Description                                             |
| --------------------- | ------------------------------ | ------------------------------------------------------- |
| OPENAI_API_KEY        |                                | The default API key used for authentication with OpenAI |
| DEFAULT_MODEL         | `gpt-3.5-turbo`                | The default model to use on new conversations           |
| DEFAULT_SYSTEM_PROMPT | [see here](utils/app/const.ts) | The default system prompt to use on new conversations   |
| GOOGLE_API_KEY        |                                | See [Custom Search JSON API documentation][GCSE]        |
| GOOGLE_CSE_ID         |                                | See [Custom Search JSON API documentation][GCSE]        |

If you do not provide an OpenAI API key with `OPENAI_API_KEY`, users will have to provide their own key.
If you don't have an OpenAI API key, you can get one [here](https://platform.openai.com/account/api-keys).

[GCSE]: https://developers.google.com/custom-search/v1/overview
