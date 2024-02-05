export const isEnglish = async (text: string, threshold = 20) => {
  const words = text.toLowerCase().split(/\s+/)
  const relevantWordCount = words.filter(word =>
    combinedEnglishAndCybersecurityWords.has(word)
  ).length
  return relevantWordCount / words.length >= threshold / 100
}

export const translateToEnglish = async (
  text: any,
  openRouterUrl: any,
  openRouterHeaders: any,
  openRouterTranslationModel: any
) => {
  const requestBody = {
    model: [`${openRouterTranslationModel}`],
    messages: [
      {
        role: "system",
        content:
          "You are a translation AI. " +
          "As a translation AI, your primary objective is to translate user-submitted text into English with high accuracy. " +
          "Focus on providing translations that are clear and direct. " +
          "Avoid adding any additional comments or information. " +
          "If the user's query is already in English, simply return the query as it is. " +
          "Your role is exclusively to translate; do not deviate from this task or engage in answering user queries."
      },
      {
        role: "user",
        content:
          "Translate the provided text into English. " +
          "Aim for an accurate and succinct translation into English. " +
          "The translation should accurately reflect the original text's meaning and context, without any supplementary comments, opinions, or extraneous information. " +
          "Refrain from engaging in discussions or asking for interpretations. " +
          "Avoid engaging in discussions or providing interpretations beyond the translation." +
          "Translate: " +
          text
      }
    ],
    temperature: 0.1,
    route: "fallback"
  }

  try {
    const request = await fetch(openRouterUrl, {
      method: "POST",
      headers: openRouterHeaders,
      body: JSON.stringify(requestBody)
    })

    if (!request.ok) {
      const response = await request.json()
      console.error("Error Code:", response.error?.code)
      console.error("Error Message:", response.error?.message)
      throw new Error(`OpenRouter error: ${response.error?.message}`)
    }

    const data = await request.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error(`Error during translation: ${error}`)
    return ""
  }
}

const combinedEnglishAndCybersecurityWords = new Set([
  "the",
  "be",
  "to",
  "of",
  "and",
  "a",
  "in",
  "that",
  "have",
  "I",
  "it",
  "for",
  "not",
  "on",
  "with",
  "he",
  "as",
  "you",
  "do",
  "at",
  "this",
  "but",
  "his",
  "by",
  "from",
  "they",
  "we",
  "say",
  "her",
  "she",
  "or",
  "an",
  "will",
  "my",
  "one",
  "all",
  "would",
  "there",
  "their",
  "what",
  "so",
  "up",
  "out",
  "if",
  "about",
  "who",
  "get",
  "which",
  "go",
  "me",
  "hack",
  "security",
  "vulnerability",
  "exploit",
  "code",
  "system",
  "network",
  "attack",
  "password",
  "access",
  "breach",
  "firewall",
  "malware",
  "phishing",
  "encryption",
  "SQL",
  "injection",
  "XSS",
  "script",
  "website",
  "server",
  "protocol",
  "port",
  "scanner",
  "tool",
  "pentest",
  "payload",
  "defense",
  "patch",
  "update",
  "compliance",
  "audit",
  "brute",
  "force",
  "DDoS",
  "botnet",
  "ransomware",
  "Trojan",
  "spyware",
  "keylogger",
  "rootkit",
  "VPN",
  "proxy",
  "SSL",
  "HTTPS",
  "session",
  "cookie",
  "authentication",
  "authorization",
  "certificate",
  "domain",
  "DNS",
  "IP",
  "address",
  "log",
  "monitor",
  "traffic",
  "data",
  "leak",
  "sensitive",
  "user",
  "admin",
  "credential",
  "privilege",
  "escalation",
  "reverse",
  "shell",
  "command",
  "control"
])
