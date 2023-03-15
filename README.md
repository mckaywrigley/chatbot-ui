# Chatbot UI Pro

Chatbot UI Pro is an advanced chatbot kit for OpenAI's chat model using Next.js, TypeScript, and Tailwind CSS.

It aims to mimic ChatGPT's interface and functionality.

All conversations are stored locally on your device.

![Chatbot UI Pro](./public/screenshot.png)

## Updates

Chatbot UI Pro will be updated over time.

Expect frequent improvements.

Next up:

- Mobile view
- Markdown formatting
- Conversation naming

## Modifications

Modify the chat interface in `components/Chat`.

Modify the sidebar interface in `components/Sidebar`.

Tweak the system prompt in `utils/index.ts`.

## Deploy

**Vercel**

Host your own live version of Chatbot UI Pro with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmckaywrigley%2Fchatbot-ui-pro&env=OPENAI_API_KEY&envDescription=Your%20OpenAI%20API%20Key.%20Chat%20will%20not%20work%20if%20you%20don't%20provide%20it.)

**Replit**

Fork Chatbot UI Pro on Replit [here](https://replit.com/@MckayWrigley/chatbot-ui-pro?v=1).

## Running Locally

**1. Clone Repo**

```bash
git clone https://github.com/mckaywrigley/chatbot-ui-pro.git
```

**2. Install Dependencies**

```bash
npm i
```

**3. Provide OpenAI API Key**

Create a .env.local file in the root of the repo with your OpenAI API Key:

```bash
OPENAI_API_KEY=<YOUR_KEY>
```

**4. Run App**

```bash
npm run dev
```

**5. Use It**

You should be able to start chatting.

## Contact

If you have any questions, feel free to reach out to me on [Twitter](https://twitter.com/mckaywrigley).
