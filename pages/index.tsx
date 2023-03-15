import { Chat } from "@/components/Chat/Chat";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Message, OpenAIModel } from "@/types";
import Head from "next/head";
import { useEffect, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [model, setModel] = useState<OpenAIModel>(OpenAIModel.GPT_3_5);
  const [lightMode, setLightMode] = useState<"dark" | "light">("dark");

  const handleSend = async (message: Message) => {
    const updatedMessages = [...messages, message];

    setMessages(updatedMessages);
    setLoading(true);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: updatedMessages
      })
    });

    if (!response.ok) {
      setLoading(false);
      throw new Error(response.statusText);
    }

    const data = response.body;

    if (!data) {
      return;
    }

    setLoading(false);

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let isFirst = true;
    let text = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);

      text += chunkValue;

      if (isFirst) {
        isFirst = false;
        setMessages((messages) => [
          ...messages,
          {
            role: "assistant",
            content: chunkValue
          }
        ]);
      } else {
        setMessages((messages) => {
          const lastMessage = messages[messages.length - 1];
          const updatedMessage = {
            ...lastMessage,
            content: lastMessage.content + chunkValue
          };
          return [...messages.slice(0, -1), updatedMessage];
        });
      }
    }

    localStorage.setItem("messageHistory", JSON.stringify([...updatedMessages, { role: "assistant", content: text }]));
  };

  const handleLightMode = (mode: "dark" | "light") => {
    setLightMode(mode);
    localStorage.setItem("theme", mode);
  };

  useEffect(() => {
    const theme = localStorage.getItem("theme");

    if (theme) {
      setLightMode(theme as "dark" | "light");
    }

    const messageHistory = localStorage.getItem("messageHistory");
    console.log(messageHistory);

    if (messageHistory) {
      setMessages(JSON.parse(messageHistory));
    }
  }, []);

  return (
    <>
      <Head>
        <title>Chatbot UI</title>
        <meta
          name="description"
          content="A simple chatbot starter kit for OpenAI's chat model using Next.js, TypeScript, and Tailwind CSS."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>

      <div className={`flex h-screen text-white ${lightMode}`}>
        <Sidebar
          lightMode={lightMode}
          onToggleLightMode={handleLightMode}
        />

        <div className="flex flex-col w-full h-full dark:bg-[#343541]">
          <Chat
            model={model}
            messages={messages}
            loading={loading}
            onSend={handleSend}
            onSelect={setModel}
          />
        </div>
      </div>
    </>
  );
}
