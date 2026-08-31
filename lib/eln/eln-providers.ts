import { ELNProvider } from "@/types/eln"

export const ELN_PROVIDERS: ELNProvider[] = [
  {
    id: "scinote",
    name: "SciNote",
    icon: "🔬",
    baseUrl: "https://www.scinote.net",
    authType: "api_key",
    description: "Open source electronic lab notebook with REST API",
    supported: true
  },
  {
    id: "benchling",
    name: "Benchling",
    icon: "⚗️",
    baseUrl: "https://benchling.com",
    authType: "api_key",
    description: "Enterprise life sciences R&D cloud platform",
    supported: true
  },
  {
    id: "elabnext",
    name: "eLabNext",
    icon: "📝",
    baseUrl: "https://www.elabnext.com",
    authType: "api_key",
    description: "Digital lab platform for life sciences",
    supported: false // To be implemented later
  }
]

export const getELNProvider = (providerId: string): ELNProvider | undefined => {
  return ELN_PROVIDERS.find(provider => provider.id === providerId)
}

export const getSupportedProviders = (): ELNProvider[] => {
  return ELN_PROVIDERS.filter(provider => provider.supported)
}
