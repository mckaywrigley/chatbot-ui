import { handleCvemapRequest } from "./cvemap/cvemap.content"
import { handleCyberchefRequest } from "./cyberchef/cyberchef.content"
import { handleSubfinderRequest } from "./subfinder/subfinder.content"
import { handleGolinkfinderRequest } from "./golinkfinder/golinkfinder.content"
import { handleNucleiRequest } from "./nuclei/nuclei.content"
import { handleKatanaRequest } from "./katana/katana.content"
import { handleHttpxRequest } from "./httpx/httpx.content"
import { handleNaabuRequest } from "./naabu/naabu.content"
import { handleGauRequest } from "./gau/gau.content"
import { handleAlterxRequest } from "./alterx/alterx.content"
import { handleDnsxRequest } from "./dnsx/dnsx.content"
import { handleAmassRequest } from "./amass/amass.content"

import { OpenAIStream } from "@/app/api/chat/plugins/openaistream"

import { Message } from "@/types/chat"

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type CommandHandler = {
  [key: string]: (...args: any[]) => any
}

type pluginHandlerFunction = (
  lastMessage: any,
  enableFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: any,
  answerMessage: any,
  invokedByToolId: boolean,
  fileData?: { fileName: string; fileContent: string }[]
) => Promise<any>

type pluginIdToHandlerMapping = {
  [key: string]: pluginHandlerFunction
}

export const pluginIdToHandlerMapping: pluginIdToHandlerMapping = {
  cvemap: handleCvemapRequest,
  cyberchef: handleCyberchefRequest,
  subfinder: handleSubfinderRequest,
  golinkfinder: handleGolinkfinderRequest,
  nuclei: handleNucleiRequest,
  katana: handleKatanaRequest,
  httpx: handleHttpxRequest,
  naabu: handleNaabuRequest,
  gau: handleGauRequest,
  alterx: handleAlterxRequest,
  dnsx: handleDnsxRequest,
  amass: handleAmassRequest
}

const commandHandlers: CommandHandler = {
  handleCvemapRequest,
  handleGolinkfinderRequest,
  handleNucleiRequest,
  handleSubfinderRequest,
  handleKatanaRequest,
  handleHttpxRequest,
  handleNaabuRequest,
  handleGauRequest,
  handleAlterxRequest,
  handleDnsxRequest,
  handleAmassRequest
}

export const isCommand = (commandName: string, message: string) => {
  if (!message.startsWith("/")) return false

  const trimmedMessage = message.trim()
  const commandPattern = new RegExp(
    `^\\/${commandName}(?:\\s+(-[a-z]+|\\S+))*$`
  )

  return commandPattern.test(trimmedMessage)
}

export const handleCommand = async (
  commandName: string,
  lastMessage: any,
  model: string,
  messagesToSend: any,
  answerMessage: any
) => {
  const handlerFunction = `handle${capitalize(commandName)}Request`
  return await commandHandlers[handlerFunction](
    lastMessage,
    process.env[`ENABLE_${commandName.toUpperCase()}_PLUGIN`] !== "FALSE",
    OpenAIStream,
    model,
    messagesToSend,
    answerMessage
  )
}

export interface ProcessAIResponseOptions {
  fileContentIncluded?: boolean
  fileNames?: string[]
  tools?: any
}

type TransformQueryFunction = (
  message: Message,
  fileContentIncluded?: boolean,
  fileNames?: string
) => string

export async function* processAIResponseAndUpdateMessage(
  lastMessage: Message,
  transformQueryFunction: TransformQueryFunction,
  OpenAIStream: {
    (
      model: string,
      messages: Message[],
      answerMessage: Message,
      tools?: any
    ): Promise<ReadableStream<any>>
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  options: ProcessAIResponseOptions = {}
): AsyncGenerator<string, { aiResponseText: string }, undefined> {
  const { fileContentIncluded = false, fileNames, tools } = options
  const joinedFileNames = fileNames?.join(", ")

  const answerPrompt = transformQueryFunction(
    lastMessage,
    fileContentIncluded,
    joinedFileNames
  )
  answerMessage.content = answerPrompt
  const openAIResponseStream = await OpenAIStream(
    model,
    messagesToSend,
    answerMessage,
    tools
  )

  let aiResponse = ""
  const reader = openAIResponseStream.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = new TextDecoder().decode(value, { stream: true })
    aiResponse += chunk
    yield chunk
  }

  return {
    aiResponseText: aiResponse
  }
}

export function getCommandFromAIResponse(
  lastMessage: Message,
  aiResponse: string
) {
  try {
    const jsonMatch = aiResponse.match(/```json\n\{.*?\}\n```/s)
    if (jsonMatch) {
      const jsonResponseString = jsonMatch[0].replace(/```json\n|\n```/g, "")
      const jsonResponse = JSON.parse(jsonResponseString)
      lastMessage.content = jsonResponse.command
    } else {
      throw new Error("No JSON command found in the AI response.")
    }
  } catch (error) {
    throw error
  }

  return lastMessage.content
}

export function formatScanResults({
  pluginName,
  pluginUrl,
  target,
  results
}: {
  pluginName: string
  pluginUrl: string
  target: string | string[] | null | undefined
  results: any
}) {
  const formattedDateTime = new Date().toLocaleString("en-US", {
    timeZone: "Etc/GMT+5",
    timeZoneName: "short"
  })

  const resultsFormatted = Array.isArray(results)
    ? results.join("\n")
    : results.split("\n").join("\n")

  let targetInfo = ""
  if (Array.isArray(target)) {
    if (target.length > 0) {
      targetInfo = `**Target**: "${target.join(", ")}"\n\n`
    }
  } else if (target && target !== "") {
    targetInfo = `**Target**: "${target}"\n\n`
  }

  return (
    `# [${pluginName}](${pluginUrl}) Results\n` +
    targetInfo +
    "**Scan Date & Time**:" +
    ` ${formattedDateTime} (UTC-5) \n\n` +
    "## Results:\n" +
    "```\n" +
    resultsFormatted +
    "\n" +
    "```\n"
  )
}

export function truncateData(data: any, maxLength: number): any {
  if (Array.isArray(data)) {
    if (data.length > maxLength) {
      const truncatedArray = data.slice(0, maxLength)
      truncatedArray.push("... [output truncated]")
      return truncatedArray
    } else {
      return data
    }
  } else if (typeof data === "string") {
    if (data.length > maxLength) {
      return `${data.slice(0, maxLength)}\n... [output truncated]`
    } else {
      return data
    }
  } else {
    return data
  }
}

export function createGKEHeaders(): Headers {
  const headers = new Headers()
  headers.set("Content-Type", "text/event-stream")
  headers.set("Cache-Control", "no-cache")
  headers.set("Connection", "keep-alive")
  return headers
}

export const processGKEData = (data: string) => {
  return data
    .split("\\n")
    .filter(line => line && !line.startsWith("data:") && line.trim() !== "")
    .join("\n")
}
