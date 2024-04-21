export interface ChatStarter {
  title: string
  description: string
  chatMessage: string
}

export interface PluginSummary {
  id: number
  name: string
  selectorName: string
  value: PluginID
  icon?: string
  description?: string
  categories: string[]
  githubRepoUrl?: string
  isInstalled: boolean
  isPremium: boolean
  starters: ChatStarter[]
}

export interface Plugin {
  id: PluginID
}

export enum PluginID {
  NONE = "none",
  CVEMAP = "cvemap",
  GOLINKFINDER = "golinkfinder",
  CYBERCHEF = "cyberchef",
  NUCLEI = "nuclei",
  SUBFINDER = "subfinder",
  KATANA = "katana",
  HTTPX = "httpx",
  NAABU = "naabu",
  GAU = "gau",
  ALTERX = "alterx",
  WEB_SEARCH = "websearch",
  ENHANCED_SEARCH = "enhancedsearch",
  DNSX = "dnsx",
  WEB_SCRAPER = "webscraper",
  PLUGINS_STORE = "pluginselector"
}

export const pluginHelp = (plugin: PluginID) => {
  if (plugin === PluginID.WEB_SCRAPER)
    return `<USER HELP>If the user asks for help or webscraper help, use the following information: The web scrapper plugin is active. The Web Scrapper plugin works automatically. Any url added in the chat by the user will be automatically scraped and converted into markdown and added as a source and added to the context of the conversation.</USER HELP>`
  return ""
}

export const Plugins: Record<PluginID, Plugin> = {
  [PluginID.NONE]: {
    id: PluginID.NONE
  },
  [PluginID.CVEMAP]: {
    id: PluginID.CVEMAP
  },
  [PluginID.CYBERCHEF]: {
    id: PluginID.CYBERCHEF
  },
  [PluginID.GOLINKFINDER]: {
    id: PluginID.GOLINKFINDER
  },
  [PluginID.NUCLEI]: {
    id: PluginID.NUCLEI
  },
  [PluginID.SUBFINDER]: {
    id: PluginID.SUBFINDER
  },
  [PluginID.KATANA]: {
    id: PluginID.KATANA
  },
  [PluginID.HTTPX]: {
    id: PluginID.HTTPX
  },
  [PluginID.NAABU]: {
    id: PluginID.NAABU
  },
  [PluginID.GAU]: {
    id: PluginID.GAU
  },
  [PluginID.ALTERX]: {
    id: PluginID.ALTERX
  },
  [PluginID.WEB_SEARCH]: {
    id: PluginID.WEB_SEARCH
  },
  [PluginID.ENHANCED_SEARCH]: {
    id: PluginID.ENHANCED_SEARCH
  },
  [PluginID.DNSX]: {
    id: PluginID.DNSX
  },
  [PluginID.WEB_SCRAPER]: {
    id: PluginID.WEB_SCRAPER
  },
  [PluginID.PLUGINS_STORE]: {
    id: PluginID.PLUGINS_STORE
  }
}

export const PluginList = Object.values(Plugins)

type pluginUrls = {
  [key: string]: string
}

export const pluginUrls: pluginUrls = {
  CVEMAP: "https://github.com/projectdiscovery/cvemap",
  CYBERCHEF: "https://github.com/gchq/CyberChef",
  SUBFINDER: "https://github.com/projectdiscovery/subfinder",
  GOLINKFINDER: "https://github.com/0xsha/GoLinkFinder",
  NUCLEI: "https://github.com/projectdiscovery/nuclei",
  KATANA: "https://github.com/projectdiscovery/katana",
  HTTPX: "https://github.com/projectdiscovery/httpx",
  NAABU: "https://github.com/projectdiscovery/naabu",
  GAU: "https://github.com/lc/gau",
  ALTERX: "https://github.com/projectdiscovery/alterx",
  DNSX: "https://github.com/projectdiscovery/dnsx"
}
