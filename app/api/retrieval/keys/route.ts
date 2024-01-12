export type KeyTypeT =
  | "OPENAI_API_KEY"
  | "ANTHROPIC_API_KEY"
  | "GOOGLE_GEMINI_API_KEY"
  | "MISTRAL_API_KEY"
  | "PERPLEXITY_API_KEY"
  | "AZURE_OPENAI_API_KEY"

// returns true if the key is found in the environment variables
function isUsingEnvironmentKey(type: KeyTypeT) {
  return Boolean(process.env[type])
}
export enum VALID_KEYS {
  OPENAI_API_KEY = "OPENAI_API_KEY",
  ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY",
  GOOGLE_GEMINI_API_KEY = "GOOGLE_GEMINI_API_KEY",
  MISTRAL_API_KEY = "MISTRAL_API_KEY",
  PERPLEXITY_API_KEY = "PERPLEXITY_API_KEY",
  AZURE_OPENAI_API_KEY = "AZURE_OPENAI_API_KEY"
}

function createResponse(data: object, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  })
}

export async function POST(request: Request) {
  const json = await request.json()
  const { key } = json as {
    key: string
  }

  if (!key) {
    return createResponse({ error: "Key type is required" }, 400)
  }

  if (!(key in VALID_KEYS)) {
    return createResponse({ error: "Invalid key type" }, 400)
  }

  const isUsing = isUsingEnvironmentKey(key as KeyTypeT)
  return createResponse({ isUsing }, 200)
}
