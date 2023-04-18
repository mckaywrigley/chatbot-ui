# Chat Everywhere 由 [Explorator Labs](https://exploratorlabs.com) 呈獻

[英文版](README-en.md)

Chat Everywhere 是一個旨在展示大型語言模型功能並讓所有人在無需登錄或地理限制的情況下使用的應用程式。在應用程式開發過程中，我們的社群貢獻了寶貴的意見反饋，使 Chat Everywhere 擁有了官方 ChatGPT 沒有的額外功能。

## 額外功能
- 文件夾結構
- 提示範本
- 導入/導出對話
- 刪除訊息
- 多語言支持
> ^感謝 [開源社群](https://github.com/mckaywrigley/chatbot-ui)
- 分享對話
- 互聯網連接增強模式（Beta）
- 響應語言選擇（即將推出）
- 儲存對話（即將推出）

## 起源

本項目源於 [Chatbot UI](https://github.com/mckaywrigley/chatbot-ui)，由 [Mckay](https://twitter.com/mckaywrigley) 發起，旨在建立一個比官方版本更優秀且開源的用戶界面。

## 項目資金計劃

[Explorator Labs](https://exploratorlabs.com) 致力於降低使用 ChatGPT 等技術的門檻，承諾提供固定的每月預算，使本項目無需登錄或付費即可使用。
隨著 Chat Everywhere 的受歡迎程度不斷提高，我們面臨著支付增加成本的挑戰，目前已超過每月 2,000 美元。在未來幾週，我們將推出付費賬戶功能，以支持項目的可持續發展，並使我們能夠為所有用戶開發更高級的功能！

## 技術棧

- [React.js](https://react.dev/)
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [LangChainJS](https://js.langchain.com)
- [Vercel](https://vercel.com/)

## 入門指南（不斷改善中）

**1. 克隆代碼庫**

```bash
git clone https://github.com/exploratortech/chat-everywhere
```

**2. 安裝Packages**

```bash
npm i
```

**3. 提供 OpenAI API 密鑰**

在代碼庫的根目錄中創建一個 .env.local 文件，並提供您的 OpenAI API 密鑰：

```bash
OPENAI_API_KEY=YOUR_KEY
```

**4. 運行應用程式**

```bash
npm run dev
```