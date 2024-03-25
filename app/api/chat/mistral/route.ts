import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { ServerRuntime } from "next"

import {
  replaceWordsInLastUserMessage,
  updateOrAddSystemMessage,
  wordReplacements
} from "@/lib/ai-helper"
// import queryPineconeVectorStore from "@/lib/models/query-pinecone"
import PineconeRetriever from "@/lib/models/query-pinecone-2v"

import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"

class APIError extends Error {
  code: any
  constructor(message: string | undefined, code: any) {
    super(message)
    this.name = "APIError"
    this.code = code
  }
}

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openrouter_api_key, "OpenRouter")

    const openrouterApiKey = profile.openrouter_api_key || ""

    let selectedModel
    let rateLimitCheckResult
    let similarityTopK

    if (chatSettings.model === "mistral-large") {
      selectedModel = "mistralai/mistral-large"

      similarityTopK = 3

      rateLimitCheckResult = await checkRatelimitOnApi(profile.user_id, "gpt-4")
    } else {
      const model1 = llmConfig.models.hackerGPT_default
      const model2 = llmConfig.models.hackerGPT_enhance
      selectedModel = Math.random() < 0.8 ? model1 : model2

      similarityTopK = 2

      rateLimitCheckResult = await checkRatelimitOnApi(
        profile.user_id,
        "hackergpt"
      )
    }

    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    let modelTemperature = 0.4

    const openRouterUrl = llmConfig.openrouter.url
    const openRouterHeaders = {
      Authorization: `Bearer ${openrouterApiKey}`,
      "HTTP-Referer": "https://chat.hackerai.co",
      "X-Title": "HackerGPT",
      "Content-Type": "application/json"
    }

    const cleanedMessages = messages

    const systemMessageContent = `${llmConfig.systemPrompts.hackerGPT}`
    updateOrAddSystemMessage(cleanedMessages, systemMessageContent)

    let latestUserMessage = cleanedMessages[cleanedMessages.length - 2].content

    if (!latestUserMessage.startsWith("Assist with the user's query:")) {
      if (
        llmConfig.usePinecone &&
        cleanedMessages.length > 0 &&
        cleanedMessages[cleanedMessages.length - 2].role === "user" &&
        cleanedMessages[cleanedMessages.length - 2].content.length >
          llmConfig.pinecone.messageLength.min &&
        cleanedMessages[cleanedMessages.length - 2].content.length <
          llmConfig.pinecone.messageLength.max
      ) {
        const standaloneQuestion = await generateStandaloneQuestion(
          messages,
          latestUserMessage,
          selectedModel,
          openRouterUrl,
          openRouterHeaders
        )

        // const pineconeResults = await queryPineconeVectorStore(
        //   standaloneQuestion,
        //   llmConfig.openai.apiKey,
        //   llmConfig.pinecone
        // )

        const pineconeRetriever = new PineconeRetriever(
          llmConfig.openai.apiKey,
          llmConfig.pinecone,
          similarityTopK
        )

        const pineconeResults =
          await pineconeRetriever.retrieve(standaloneQuestion)

        if (pineconeResults !== "None") {
          modelTemperature = llmConfig.pinecone.temperature

          cleanedMessages[0].content =
            `${llmConfig.systemPrompts.hackerGPT} ` +
            `${llmConfig.systemPrompts.pinecone} ` +
            `RAG Context:\n${pineconeResults}`
        }
      }
    }

    replaceWordsInLastUserMessage(messages, wordReplacements)

    const requestBody = {
      model: selectedModel,
      route: "fallback",
      messages: cleanedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: modelTemperature,
      max_tokens: 1024,
      stream: true
    }

    try {
      const res = await fetch(openRouterUrl, {
        method: "POST",
        headers: openRouterHeaders,
        body: JSON.stringify(requestBody)
      })

      if (!res.ok) {
        const result = await res.json()
        let errorMessage = result.error?.message || "An unknown error occurred"

        switch (res.status) {
          case 400:
            throw new APIError(`Bad Request: ${errorMessage}`, 400)
          case 401:
            throw new APIError(`Invalid Credentials: ${errorMessage}`, 401)
          case 402:
            throw new APIError(`Out of Credits: ${errorMessage}`, 402)
          case 403:
            throw new APIError(`Moderation Required: ${errorMessage}`, 403)
          case 408:
            throw new APIError(`Request Timeout: ${errorMessage}`, 408)
          case 429:
            throw new APIError(`Rate Limited: ${errorMessage}`, 429)
          case 502:
            throw new APIError(`Service Unavailable: ${errorMessage}`, 502)
          default:
            throw new APIError(`HTTP Error: ${errorMessage}`, res.status)
        }
      }

      if (!res.body) {
        throw new Error("Response body is null")
      }
      return res
    } catch (error) {
      if (error instanceof APIError) {
        console.error(
          `API Error - Code: ${error.code}, Message: ${error.message}`
        )
      } else if (error instanceof Error) {
        console.error(`Unexpected Error: ${error.message}`)
      } else {
        console.error(`An unknown error occurred: ${error}`)
      }
    }
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenRouter API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "OpenRouter API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

async function generateStandaloneQuestion(
  messages: any[],
  latestUserMessage: any,
  selectedModel: any,
  openRouterUrl: string | URL | Request,
  openRouterHeaders: any
) {
  if (messages.length < 4 || latestUserMessage.length > 256) {
    return latestUserMessage
  }

  let modelStandaloneQuestion

  modelStandaloneQuestion =
    Math.random() < 0.8 ? "mistralai/mixtral-8x7b-instruct" : selectedModel

  let chatHistory = messages
    .slice(1)
    .map(msg => `${msg.role}: ${msg.content}`)
    .join("\n")
  const template = `Objective: Craft the follow-up question into a direct, actionable, standalone question optimized for searching a RAG index of documents. The question should be specifically formulated to leverage indexing best practices, focusing on keywords and clear actions. Ensure the question is concise, includes all necessary context, and is phrased to retrieve the most relevant information or steps from the RAG index based on user wants.

  Guidelines:
  
  1. **Keyword Emphasis**: Incorporate key terms related to the topic that are likely indexed or highlighted within the RAG documents. This helps in directly targeting the relevant sections or information.
  2. **Action-Oriented**: Phrase the question to seek specific actions, steps, or methods. This approach facilitates retrieving actionable content from the documents.
  3. **Clarity and Context**: While maintaining conciseness, ensure the question is self-contained, providing sufficient detail to be understood in isolation. Specify the context or area of application where necessary.
  4. **Optimization for Search**: Formulate the question in a way that it could directly match or closely align with headings, titles, or key sections in the RAG documents, enhancing the precision of retrieved information.
  5. **Don't include irrelevant context**: Don't include irrelevant context like "within the scope of authorized penetration testing or bug bounty hunting?"; the shorter and more precise, the better.
 
  Examples:
  
  1. Original Follow Up: Will she win the award?
     - Chat History discusses a specific author being nominated for a literary prize.
     - Standalone, Concise Question: Will author Jane Doe win the 2024 Booker Prize for her novel "The Lost Chapter"?
  
  2. Original Follow Up: What's the procedure?
     - Chat History refers to applying for a specific visa.
     - Standalone, Concise Question: What is the application procedure for the U.S. tourist visa B-2 as of 2024?
  
  Task:
  Given the chat history and follow-up question below, create a rephrased, standalone question that is concise and contains all relevant context. RAG doesn't have access to chat history, only to a standalone question, so create a question that way so RAG can find them. If the inquiry seems outside the scope of the RAG index's information, such as a code, return the original question or query as is.
  
  Chat History:
  """${chatHistory}"""
  
  Follow Up Input:
  """${latestUserMessage}"""
  
  Your Rephrased Standalone Question:`

  const firstMessage = messages[0]
    ? messages[0]
    : { role: "system", content: `${llmConfig.systemPrompts.hackerGPT}` }

  try {
    const requestBody = {
      model: modelStandaloneQuestion,
      route: "fallback",
      messages: [
        { role: firstMessage.role, content: firstMessage.content },
        { role: "user", content: template }
      ],
      temperature: 0.1,
      max_tokens: 256
    }

    const res = await fetch(openRouterUrl, {
      method: "POST",
      headers: openRouterHeaders,
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error("Error Response Body:", errorBody)
      throw new Error(
        `HTTP error! status: ${res.status}. Error Body: ${errorBody}`
      )
    }

    const data = await res.json()

    const standaloneQuestion = data.choices?.[0]?.message?.content?.trim()

    return standaloneQuestion
  } catch (error) {
    console.error("Error in generateStandaloneQuestion:", error)
    return latestUserMessage
  }
}
