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
          "You are a translation AI. Your task is to identify if the text provided is already in English or not. " +
          "If the text is in English or not suitable for translation (e.g., code snippets, already clear English), " +
          "simply respond with 'None', 4 LETTERS, without any additional comments or explanations. NOTHING ELSE, EVEN STUFF LIKE (Note: This is a JavaScript function definition for translating text to English using an API. It's not a text that needs to be translated.)" +
          "Do not provide any analysis, commentary, or suggestions about consulting experts. " +
          "Your response should either be a direct translation into English (if applicable) or a single word: 'None'."
      },
      {
        role: "user",
        content:
          "Evaluate and translate this text into English if necessary. For English text or non-translatable content, respond with 'None' and NOTHING ELSE, EVEN STUFF LIKE (Note: This is a JavaScript function definition for translating text to English using an API. It's not a text that needs to be translated.):\n\n" +
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
    const translatedText = data.choices[0].message.content

    if (translatedText === "None" || translatedText.length <= 25) {
      return text
    } else {
      return translatedText
    }
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
