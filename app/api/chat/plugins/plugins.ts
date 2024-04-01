import { handleCvemapRequest } from "./cvemap/cvemap.content"
import { handleSubfinderRequest } from "./subfinder/subfinder.content"
import { handleGoLinkFinderRequest } from "./golinkfinder/golinkfinder.content"
import { handleKatanaRequest } from "./katana/katana.content"
import { handleHttpxRequest } from "./httpx/httpx.content"
import { handleNaabuRequest } from "./naabu/naabu.content"
import { handleGauRequest } from "./gau/gau.content"
import { handleAlterxRequest } from "./alterx/alterx.content"

type pluginUrls = {
  [key: string]: string
}

export const pluginUrls: pluginUrls = {
  CVEmap: "https://github.com/projectdiscovery/cvemap",
  Subfinder: "https://github.com/projectdiscovery/subfinder",
  GoLinkFinder: "https://github.com/0xsha/GoLinkFinder",
  Nuclei: "https://github.com/projectdiscovery/nuclei",
  Katana: "https://github.com/projectdiscovery/katana",
  HttpX: "https://github.com/projectdiscovery/httpx",
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
  subfinder: handleSubfinderRequest,
  golinkfinder: handleGoLinkFinderRequest,
  katana: handleKatanaRequest,
  httpx: handleHttpxRequest,
  naabu: handleNaabuRequest,
  gau: handleGauRequest,
  alterx: handleAlterxRequest
}
