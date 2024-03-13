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
}

export interface Plugin {
  id: PluginID
}

export enum PluginID {
  NONE = "none",
  CVEMAP = "cvemap",
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
  PLUGINS_STORE = "pluginselector"
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
  [PluginID.PLUGINS_STORE]: {
    id: PluginID.PLUGINS_STORE
  }
}

export const PluginList = Object.values(Plugins)
