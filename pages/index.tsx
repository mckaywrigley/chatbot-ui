import { Chat } from "@/components/Chat/Chat";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Conversation, Message, OpenAIModel } from "@/types";
import Head from "next/head";
import { useEffect, useState } from "react";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation>();
  const [loading, setLoading] = useState<boolean>(false);
  const [model, setModel] = useState<OpenAIModel>(OpenAIModel.GPT_3_5);
  const [lightMode, setLightMode] = useState<"dark" | "light">("dark");

  const handleSend = async (message: Message) => {
    if (selectedConversation) {
      let updatedConversation: Conversation = {
        ...selectedConversation,
        messages: [...selectedConversation.messages, message]
      };

      setSelectedConversation(updatedConversation);
      setLoading(true);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: updatedConversation.messages
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
          const updatedMessages: Message[] = [...updatedConversation.messages, { role: "assistant", content: chunkValue }];

          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages
          };

          setSelectedConversation(updatedConversation);
        } else {
          const updatedMessages: Message[] = updatedConversation.messages.map((message, index) => {
            if (index === updatedConversation.messages.length - 1) {
              return {
                ...message,
                content: text
              };
            }

            return message;
          });

          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages
          };

          setSelectedConversation(updatedConversation);
        }
      }

      localStorage.setItem("selectedConversation", JSON.stringify(updatedConversation));

      const updatedConversations: Conversation[] = conversations.map((conversation) => {
        if (conversation.id === selectedConversation.id) {
          return updatedConversation;
        }

        return conversation;
      });

      if (updatedConversations.length === 0) {
        updatedConversations.push(updatedConversation);
      }

      setConversations(updatedConversations);

      localStorage.setItem("conversationHistory", JSON.stringify(updatedConversations));
    }
  };

  const handleLightMode = (mode: "dark" | "light") => {
    setLightMode(mode);
    localStorage.setItem("theme", mode);
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: conversations.length + 1,
      name: "",
      messages: []
    };

    const updatedConversations = [...conversations, newConversation];
    setConversations(updatedConversations);
    localStorage.setItem("conversationHistory", JSON.stringify(updatedConversations));

    setSelectedConversation(newConversation);
    localStorage.setItem("selectedConversation", JSON.stringify(newConversation));

    setModel(OpenAIModel.GPT_3_5);
    setLoading(false);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    localStorage.setItem("selectedConversation", JSON.stringify(conversation));
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    const updatedConversations = conversations.filter((c) => c.id !== conversation.id);
    setConversations(updatedConversations);
    localStorage.setItem("conversationHistory", JSON.stringify(updatedConversations));

    if (selectedConversation && selectedConversation.id === conversation.id) {
      setSelectedConversation(undefined);
      localStorage.removeItem("selectedConversation");
    }
  };

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme) {
      setLightMode(theme as "dark" | "light");
    }

    const conversationHistory = localStorage.getItem("conversationHistory");

    if (conversationHistory) {
      setConversations(JSON.parse(conversationHistory));
    }

    const selectedConversation = localStorage.getItem("selectedConversation");
    if (selectedConversation) {
      setSelectedConversation(JSON.parse(selectedConversation));
    } else {
      setSelectedConversation({
        id: 1,
        name: "",
        messages: []
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Chatbot UI Pro</title>
        <meta
          name="description"
          content="An advanced chatbot starter kit for OpenAI's chat model using Next.js, TypeScript, and Tailwind CSS."
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
      {selectedConversation && (
        <div className={`flex h-screen text-white ${lightMode}`}>
          <Sidebar
            conversations={conversations}
            lightMode={lightMode}
            selectedConversation={selectedConversation}
            onToggleLightMode={handleLightMode}
            onNewConversation={handleNewConversation}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
          />

          <div className="flex flex-col w-full h-full dark:bg-[#343541]">
            <Chat
              model={model}
              messages={selectedConversation.messages}
              loading={loading}
              onSend={handleSend}
              onSelect={setModel}
            />
          </div>
        </div>
      )}
    </>
  );
}
