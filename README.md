# Chatbot UI

**Note: Chatbot UI Pro has been renamed to Chatbot UI.**

Chatbot UI is an advanced chatbot kit for OpenAI's chat models built on top of [Chatbot UI Lite](https://github.com/mckaywrigley/chatbot-ui-lite) using Next.js, TypeScript, and Tailwind CSS.

It aims to mimic ChatGPT's interface and functionality.

All conversations are stored locally on your device.

See a [demo](https://twitter.com/mckaywrigley/status/1636103188733640704).

![Chatbot UI](./public/screenshot.png)

## Updates

Chatbot UI will be updated over time.

Expect frequent improvements.

**Next up:**

- [ ] Saving via data export
- [ ] Folders
- [ ] Custom model settings
- [ ] Prompt templates
- [ ] Regenerate responses

**Recent updates:**

- [x] GPT-4 support (access required) (3/20/23)
- [x] Search conversations (3/19/23)
- [x] Code syntax highlighting (3/18/23)
- [x] Toggle sidebar (3/18/23)
- [x] Conversation naming (3/18/23)
- [x] Github flavored markdown (3/18/23)
- [x] Add OpenAI API key in app (3/18/23)
- [x] Markdown support (3/17/23)

## Modifications

Modify the chat interface in `components/Chat`.

Modify the sidebar interface in `components/Sidebar`.

Modify the system prompt in `utils/index.ts`.

## Deploy

**Vercel**

Host your own live version of Chatbot UI with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmckaywrigley%2Fchatbot-ui&env=OPENAI_API_KEY&envDescription=Your%20OpenAI%20API%20Key.%20Chat%20will%20not%20work%20if%20you%20don't%20provide%20it.)

**Replit**

Fork Chatbot UI on Replit [here](https://replit.com/@MckayWrigley/chatbot-ui-pro?v=1).

**Docker**

```shell
docker build -t chatgpt-ui .
docker run -e OPENAI_API_KEY=xxxxxxxx -p 3000:3000 chatgpt-ui
```

## Running Locally

**1. Clone Repo**

```bash
git clone https://github.com/mckaywrigley/chatbot-ui.git
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

**4. Run App**

```bash
npm run dev
```

**5. Use It**

You should be able to start chatting.

## Contact

If you have any questions, feel free to reach out to me on [Twitter](https://twitter.com/mckaywrigley).
