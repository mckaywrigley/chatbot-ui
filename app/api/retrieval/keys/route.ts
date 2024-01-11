import type { NextApiRequest, NextApiResponse } from "next"

export type KeyTypeT =
  | "OPENAI_API_KEY"
  | "ANTHROPIC_API_KEY"
  | "GOOGLE_GEMINI_API_KEY"
  | "MISTRAL_API_KEY"
  | "PERPLEXITY_API_KEY"

// returns true if the key is found in the environment variables
function isUsingEnvironmentKey(type: KeyTypeT) {
  return Boolean(process.env[type])
}
export enum VALID_KEYS {
  OPENAI_API_KEY = "OPENAI_API_KEY",
  ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY",
  GOOGLE_GEMINI_API_KEY = "GOOGLE_GEMINI_API_KEY",
  MISTRAL_API_KEY = "MISTRAL_API_KEY",
  PERPLEXITY_API_KEY = "PERPLEXITY_API_KEY"
}

export async function POST(request: Request) {
  const json = await request.json()
  const { key } = json as {
    key: string
  }

  if (!key) {
    return new Response(JSON.stringify({ error: "Key type is required" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  if (!(key in VALID_KEYS)) {
    return new Response(JSON.stringify({ error: "Invalid key type" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json"
      }
    })
  }

  const isUsing = isUsingEnvironmentKey(key as KeyTypeT)
  return new Response(JSON.stringify({ isUsing }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  })
}
