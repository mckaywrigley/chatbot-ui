import { ChatMessage } from "@/types"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

const buildContextMessages = (
  chatMessages: ChatMessage[],
  numberOfMessagesConsidered: number,
  maxHistoryTokens: number
) => {
  const contextMessages = chatMessages
    .slice(-numberOfMessagesConsidered)
    .map(
      message => "**" + message.message.role + "**: " + message.message.content
    )

  const encode = require("gpt-tokenizer").encode
  let totalTokens = 0
  let truncatedContextMessages = []

  for (let i = contextMessages.length - 1; i >= 0; i--) {
    const messageTokens = encode(contextMessages[i]).length
    if (totalTokens + messageTokens <= maxHistoryTokens) {
      truncatedContextMessages.unshift(contextMessages[i])
      totalTokens += messageTokens
    } else {
      break
    }
  }

  return truncatedContextMessages.join("\n\n")
}

const rephraserPromptBuilder = (
  prompt: string,
  contextMessages: string,
  userInput: string,
  rephraserPrompt: string,
  rephraserOutput: string
) =>
  (prompt ? "<PROMPT>" + prompt + "</PROMPT>\n\n" : "") +
  "<CONVERSATION>" +
  contextMessages +
  "</CONVERSATION>\n\n" +
  "<USER INPUT>" +
  userInput +
  "</USER INPUT>\n\n" +
  rephraserPrompt +
  "\n" +
  "Use the following output format:\n\n" +
  "Resoning: {your reasoning, think step-by-step and be consice}\n\n" +
  "```xml<RESULT>" +
  rephraserOutput +
  "</RESULT>```"

export const rephraser = async (
  client: OpenAI,
  model: ChatCompletionCreateParamsBase["model"],
  messageContent: string,
  prompt: string,
  mode: "rephrase" | "hyde" | "step-back" | undefined,
  chatMessages: ChatMessage[],
  numberOfMessagesConsidered: number,
  maxHistoryTokens: number
) => {
  const contextMessages = buildContextMessages(
    chatMessages,
    numberOfMessagesConsidered,
    maxHistoryTokens
  )

  let rephraserPrompt = ""
  let rephraserOutput = ""

  switch (mode) {
    // https://arxiv.org/pdf/2212.10496.pdf
    case "hyde":
      rephraserPrompt =
        "Given the prompt, the conversation and the user input, write a 100-word passage to answer the question."
      rephraserOutput = "{Your 100-word passage}"
      break

    // https://arxiv.org/pdf/2310.06117.pdf
    case "step-back":
      rephraserPrompt =
        "You are an expert at world knowledge. Your task is to step back and paraphrase a question to a more generic step-back question, which is easier to answer. \n" +
        "Example 1: Question: Carlos Ascues played for which team from 2013 to 2014? Step-Back Question: Which teams did Carlos Ascues play for?\n" +
        "Example 2: Question: Could you drive a Rowe 550 to the 2008 Summer Olympics? Step-Back Question: What kind of vehicle is a Rowe 550?\n\n"
      "Given the prompt, the conversation and the user input, write a the step-back question, which is easier to answer."
      rephraserOutput = "{The step-back question}"
      break

    // Standard rephraser
    default:
      rephraserPrompt =
        "Based on the provided prompt, conversation, and user input, refine the user input for clarity in a overly verbose way. Ensure to substitute any item references with their specific labels and replace pronouns with the corresponding names."
      rephraserOutput = "{Your rephrased question}"
  }

  const enrichResponseCall = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: rephraserPromptBuilder(
          prompt,
          contextMessages,
          messageContent,
          rephraserPrompt,
          rephraserOutput
        )
      }
    ],
    temperature: 0.5,
    max_tokens: 1024,
    stream: false
  })

  const result = enrichResponseCall.choices[0].message.content

  console.log("Rephraser result:", result)

  return result?.split("<RESULT>")[1].split("</RESULT>")[0].trim()
}
