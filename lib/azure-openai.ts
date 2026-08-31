import { AzureOpenAI } from "openai"
import { addTokensToActiveContext } from "@/lib/billing/usage-context"

let _defaultClient: AzureOpenAI | null = null
const _deploymentClients = new Map<string, AzureOpenAI>()

function coerceReasoningParams<T extends Record<string, any>>(params: T): T {
  if (!params || typeof params !== "object") return params
  const out: any = { ...params }
  // Force temperature to 1 (only value reasoning models accept).
  if ("temperature" in out && out.temperature !== 1) out.temperature = 1
  // Translate the legacy `max_tokens` field. Reasoning models accept
  // `max_completion_tokens` only; passing both causes a 400.
  if ("max_tokens" in out && !("max_completion_tokens" in out)) {
    out.max_completion_tokens = out.max_tokens
    delete out.max_tokens
  }
  // Floor `max_completion_tokens` for reasoning models. The design agents set
  // tight caps (generation 1000, statCheck 1500, reportWriter 3000, …) tuned
  // for gpt-4.1's OUTPUT-only budget. On gpt-5.x that same field also has to
  // cover hidden reasoning tokens, so the structured JSON gets truncated
  // mid-object → finish_reason:"length" → `.beta…parse()` throws
  // "Could not parse response content as the length limit was reached", which
  // made every hypothesis/design/report agent come back empty. Since the field
  // is an upper BOUND (you only pay for tokens actually produced), raising a
  // too-low cap can't increase cost - it only stops premature truncation.
  // Callers wanting a smaller ceiling can set AZURE_OPENAI_MIN_COMPLETION_TOKENS.
  if (
    "max_completion_tokens" in out &&
    typeof out.max_completion_tokens === "number"
  ) {
    const floor =
      Number(process.env.AZURE_OPENAI_MIN_COMPLETION_TOKENS) || 16000
    if (out.max_completion_tokens < floor) out.max_completion_tokens = floor
  }
  // Cap reasoning effort at "low" by default. gpt-5.x with `medium`
  // (the platform default) spends 30-90s thinking on 5-10k-token prompts,
  // which blew through Vercel's 300s function timeout when the lit-scout
  // hit summarization (40 papers × abstracts ≈ 20k tokens). Probing
  // gpt-5.5 with `reasoning_effort: "low"` on a 8.4k-prompt: 0 reasoning
  // tokens, 3.8s total - easily within budget.
  // Callers can override by passing an explicit `reasoning_effort` value.
  if (!("reasoning_effort" in out)) out.reasoning_effort = "low"
  return out as T
}

function wrapForReasoningModel(client: AzureOpenAI): AzureOpenAI {
  // Two-level Proxy: top → chat.completions / beta.chat.completions →
  // (create | parse). The leaf wrapper coerces the first arg and forwards.
  const wrapCompletionsObj = (completions: any): any =>
    new Proxy(completions, {
      get(target, key, receiver) {
        const v = Reflect.get(target, key, receiver)
        if (
          typeof v === "function" &&
          (key === "create" || key === "parse" || key === "stream")
        ) {
          return function (this: any, ...args: any[]) {
            if (args[0]) args[0] = coerceReasoningParams(args[0])
            const result = v.apply(this === receiver ? target : this, args)
            // Side-channel token metering: non-streaming create/parse resolve to
            // a response carrying `usage`. Push it into the active usage context
            // (no-op when there's no scope, e.g. edge chat or unmetered calls).
            // This observer never alters the promise handed back to the caller.
            if (
              (key === "create" || key === "parse") &&
              result &&
              typeof (result as any).then === "function"
            ) {
              ;(result as Promise<any>).then(
                res => {
                  try {
                    if (res?.usage) addTokensToActiveContext(res.usage)
                  } catch {
                    /* metering must never break the call */
                  }
                },
                () => {
                  /* swallow - caller handles the rejection */
                }
              )
            }
            return result
          }
        }
        return v
      }
    })

  const wrapChatObj = (chat: any): any =>
    new Proxy(chat, {
      get(target, key, receiver) {
        const v = Reflect.get(target, key, receiver)
        if (key === "completions" && v && typeof v === "object") {
          return wrapCompletionsObj(v)
        }
        return v
      }
    })

  return new Proxy(client, {
    get(target, key, receiver) {
      const v = Reflect.get(target, key, receiver)
      if (key === "chat" && v && typeof v === "object") return wrapChatObj(v)
      if (key === "beta" && v && typeof v === "object") {
        return new Proxy(v, {
          get(b, k, br) {
            const sub = Reflect.get(b, k, br)
            if (k === "chat" && sub && typeof sub === "object") {
              return wrapChatObj(sub)
            }
            return sub
          }
        })
      }
      return v
    }
  }) as AzureOpenAI
}

function getEnv(name: string): string | undefined {
  return process.env[name]
}

function requireEnv(name: string): string {
  const v = getEnv(name)
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

/**
 * Lazily creates a shared Azure OpenAI client using env vars:
 * - AZURE_OPENAI_KEY
 * - AZURE_OPENAI_ENDPOINT
 * - AZURE_OPENAI_API_VERSION
 * - AZURE_OPENAI_DEPLOYMENT
 */
export function getAzureOpenAI(): AzureOpenAI {
  if (_defaultClient) return _defaultClient

  // Support both names to reduce surprises (SDK defaults to AZURE_OPENAI_API_KEY)
  const apiKey = getEnv("AZURE_OPENAI_KEY") || getEnv("AZURE_OPENAI_API_KEY")
  if (!apiKey) {
    throw new Error(
      "Missing required env var: AZURE_OPENAI_KEY (or AZURE_OPENAI_API_KEY)"
    )
  }

  const endpoint = requireEnv("AZURE_OPENAI_ENDPOINT")
  const apiVersion = requireEnv("AZURE_OPENAI_API_VERSION")
  const deployment = requireEnv("AZURE_OPENAI_DEPLOYMENT")

  _defaultClient = wrapForReasoningModel(
    new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
      deployment
    })
  )

  return _defaultClient
}

export function getAzureOpenAIModel(): string {
  return requireEnv("AZURE_OPENAI_DEPLOYMENT")
}

export function getAzureOpenAIForDeployment(deployment: string): AzureOpenAI {
  const key = deployment.trim()
  if (!key) throw new Error("Azure OpenAI deployment name must be non-empty")

  const existing = _deploymentClients.get(key)
  if (existing) return existing

  const apiKey = getEnv("AZURE_OPENAI_KEY") || getEnv("AZURE_OPENAI_API_KEY")
  if (!apiKey) {
    throw new Error(
      "Missing required env var: AZURE_OPENAI_KEY (or AZURE_OPENAI_API_KEY)"
    )
  }

  const endpoint = requireEnv("AZURE_OPENAI_ENDPOINT")
  const apiVersion = requireEnv("AZURE_OPENAI_API_VERSION")

  const client = wrapForReasoningModel(
    new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
      deployment: key
    })
  )

  _deploymentClients.set(key, client)
  return client
}

// -----------------------------
// Design-module helpers
// (uses a separate deployment for better temperature control)
// -----------------------------

export function getDesignDeployment(): string {
  return (process.env.AZURE_OPENAI_DESIGN_DEPLOYMENT || "gpt-4.1").trim()
}

export function getAzureOpenAIForDesign(): AzureOpenAI {
  return getAzureOpenAIForDeployment(getDesignDeployment())
}

// -----------------------------
// Embeddings-specific helpers
// -----------------------------

export function getAzureOpenAIEmbeddingsDeployment(): string {
  return (
    process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT ||
    process.env.AZURE_OPENAI_DEPLOYMENT ||
    ""
  ).trim()
}

export function getAzureOpenAIEmbeddingsClient(): AzureOpenAI {
  const deployment = getAzureOpenAIEmbeddingsDeployment()
  if (!deployment) {
    throw new Error(
      "Azure embeddings deployment not configured. Set AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT (recommended) or AZURE_OPENAI_DEPLOYMENT."
    )
  }

  // Allow using a separate Azure OpenAI resource for embeddings.
  const apiKey =
    process.env.AZURE_OPENAI_EMBEDDINGS_KEY ||
    process.env.AZURE_OPENAI_KEY ||
    process.env.AZURE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      "Missing required env var: AZURE_OPENAI_KEY (or AZURE_OPENAI_API_KEY). Optionally AZURE_OPENAI_EMBEDDINGS_KEY."
    )
  }

  const endpoint =
    process.env.AZURE_OPENAI_EMBEDDINGS_ENDPOINT ||
    process.env.AZURE_OPENAI_ENDPOINT
  if (!endpoint)
    throw new Error("Missing required env var: AZURE_OPENAI_ENDPOINT")

  const apiVersion =
    process.env.AZURE_OPENAI_EMBEDDINGS_API_VERSION ||
    process.env.AZURE_OPENAI_API_VERSION
  if (!apiVersion)
    throw new Error("Missing required env var: AZURE_OPENAI_API_VERSION")

  // Use per-deployment cache so repeated calls don't allocate new clients
  const cacheKey = `embeddings:${endpoint}:${apiVersion}:${deployment}`
  const existing = _deploymentClients.get(cacheKey)
  if (existing) return existing

  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    apiVersion,
    deployment
  })

  _deploymentClients.set(cacheKey, client)
  return client
}
