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

type CommandHandler = {
  [key: string]: (...args: any[]) => any
}

type pluginUrls = {
  [key: string]: string
}

export const pluginUrls: pluginUrls = {
  CVEmap: "https://github.com/projectdiscovery/cvemap",
  Cyberchef: "https://github.com/gchq/CyberChef",
  Subfinder: "https://github.com/projectdiscovery/subfinder",
  GoLinkFinder: "https://github.com/0xsha/GoLinkFinder",
  Nuclei: "https://github.com/projectdiscovery/nuclei",
  Katana: "https://github.com/projectdiscovery/katana",
  Httpx: "https://github.com/projectdiscovery/httpx",
  Naabu: "https://github.com/projectdiscovery/naabu",
  Gau: "https://github.com/lc/gau",
  Alterx: "https://github.com/projectdiscovery/alterx"
}

type pluginHandlerFunction = (
  lastMessage: any,
  enableFeature: boolean,
  OpenAIStream: any,
  model: string,
  messagesToSend: any,
  answerMessage: any,
  invokedByToolId: boolean
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const isCommand = (commandName: string, message: string) => {
  const checkFunction = `is${capitalize(commandName)}Command`
  if (typeof commandHandlers[checkFunction] === "function") {
    return commandHandlers[checkFunction](message)
  } else {
    console.error(`Function ${checkFunction} is not defined.`)
    return false // Or handle the error as appropriate
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
