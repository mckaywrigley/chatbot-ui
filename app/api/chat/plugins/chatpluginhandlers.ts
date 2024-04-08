import { handleCvemapRequest, isCvemapCommand } from "./cvemap/cvemap.content"
import { handleCyberchefRequest } from "./cyberchef/cyberchef.content"
import {
  handleSubfinderRequest,
  isSubfinderCommand
} from "./subfinder/subfinder.content"
import {
  handleGolinkfinderRequest,
  isGolinkfinderCommand
} from "./golinkfinder/golinkfinder.content"
import { handleNucleiRequest, isNucleiCommand } from "./nuclei/nuclei.content"
import { handleKatanaRequest, isKatanaCommand } from "./katana/katana.content"
import { handleHttpxRequest, isHttpxCommand } from "./httpx/httpx.content"
import { handleNaabuRequest, isNaabuCommand } from "./naabu/naabu.content"
import { handleGauRequest, isGauCommand } from "./gau/gau.content"
import { handleAlterxRequest, isAlterxCommand } from "./alterx/alterx.content"

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
  fileContent: string,
  fileName: string
) => Promise<any>

type pluginIdToHandlerMapping = {
  [key: string]: pluginHandlerFunction
}

type TransformQueryFunction = (
  message: Message,
  fileContentIncluded?: boolean,
  fileName?: string
) => string

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
  alterx: handleAlterxRequest
}

const commandHandlers: CommandHandler = {
  isCvemapCommand,
  handleCvemapRequest,
  isGolinkfinderCommand,
  handleGolinkfinderRequest,
  isNucleiCommand,
  handleNucleiRequest,
  isSubfinderCommand,
  handleSubfinderRequest,
  isKatanaCommand,
  handleKatanaRequest,
  isHttpxCommand,
  handleHttpxRequest,
  isNaabuCommand,
  handleNaabuRequest,
  isGauCommand,
  handleGauRequest,
  isAlterxCommand,
  handleAlterxRequest
}

export const isCommand = (commandName: string, message: string) => {
  const checkFunction = `is${capitalize(commandName)}Command`
  if (typeof commandHandlers[checkFunction] === "function") {
    return commandHandlers[checkFunction](message)
  } else {
    return false
  }
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
  fileName?: string
}

export async function processAIResponseAndUpdateMessage(
  lastMessage: Message,
  transformQueryFunction: TransformQueryFunction,
  OpenAIStream: {
    (
      model: string,
      messages: Message[],
      answerMessage: Message
    ): Promise<ReadableStream<any>>
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  options: ProcessAIResponseOptions = {}
): Promise<{ updatedLastMessageContent: string; aiResponseText: string }> {
  const { fileContentIncluded = false, fileName } = options

  const fileNameIncluded =
    fileContentIncluded && fileName && fileName.length > 0

  const answerPrompt = transformQueryFunction(
    lastMessage,
    fileContentIncluded,
    fileNameIncluded ? fileName : "hosts.txt"
  )
  answerMessage.content = answerPrompt

  const openAIResponseStream = await OpenAIStream(
    model,
    messagesToSend,
    answerMessage
  )

  let aiResponse = ""
  const reader = openAIResponseStream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    aiResponse += new TextDecoder().decode(value, { stream: true })
  }

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
    console.error(
      `Error extracting and parsing JSON from AI response: ${error}`
    )
    throw error
  }

  return {
    updatedLastMessageContent: lastMessage.content,
    aiResponseText: aiResponse
  }
}

export function formatScanResults({
  pluginName,
  pluginUrl,
  target,
  results
}: {
  pluginName: string
  pluginUrl: string
  target: string | string[]
  results: any
}) {
  const formattedDateTime = new Date().toLocaleString("en-US", {
    timeZone: "Etc/GMT+5",
    timeZoneName: "short"
  })

  const resultsFormatted = Array.isArray(results)
    ? results.join("\n")
    : results.split("\n").join("\n")

  return (
    `# [${pluginName}](${pluginUrl}) Results\n` +
    '**Target**: "' +
    target +
    '"\n\n' +
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
