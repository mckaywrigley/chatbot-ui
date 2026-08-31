import OpenAI from "openai"
import { getAzureOpenAI, getAzureOpenAIModel } from "@/lib/azure-openai"

const DEFAULT_TIMEOUT_MS = 60000
const MAX_RETRIES = 3

// Get Azure OpenAI client instance
function getOpenAIClient(): OpenAI {
  return getAzureOpenAI()
}

// Exponential backoff delay
function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10000) // Max 10s
}

// Check if error is retryable
function isRetryableError(error: any): boolean {
  if (!error) return false
  const status = error.status || error.response?.status
  return status === 429 || (status >= 500 && status < 600)
}

export interface CallModelOptions {
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  retries?: number
}

export interface CallModelResult {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Call OpenAI model with retries and timeout handling
 */
export async function callModel(
  prompt: string,
  systemPrompt?: string,
  options: CallModelOptions = {}
): Promise<CallModelResult> {
  const {
    // gpt-5.x reasoning models reject any value other than 1 with
    // `unsupported_value: temperature does not support N. Only the default
    // (1) value is supported.`. The shared SDK shim in lib/azure-openai.ts
    // coerces this to 1 regardless of what callers pass, so the parameter
    // here is API-compatible only - we keep `_temperature` ignored.
    temperature: _temperature,
    maxTokens,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = MAX_RETRIES
  } = options
  void _temperature

  const openai = getOpenAIClient()
  const model = getAzureOpenAIModel()
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt })
  }
  messages.push({ role: "user", content: prompt })

  let lastError: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      // Some newer Azure/OpenAI deployments reject `max_tokens` and require
      // `max_completion_tokens` instead. We'll prefer `max_completion_tokens`
      // and fall back to `max_tokens` if the provider rejects it.
      const baseParams: any = {
        model,
        messages,
        // Temperature is coerced to 1 by the SDK shim (reasoning-model
        // constraint). Passing it explicitly here is harmless.
        temperature: 1,
        ...(typeof maxTokens === "number"
          ? { max_completion_tokens: maxTokens }
          : {})
      }

      let response: any
      try {
        response = await openai.chat.completions.create(baseParams, {
          signal: controller.signal as any
        })
      } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : ""
        // Fallback for providers/models that only support legacy `max_tokens`.
        if (
          typeof maxTokens === "number" &&
          (msg.includes("Unsupported parameter: 'max_completion_tokens'") ||
            msg.includes("max_completion_tokens is not supported"))
        ) {
          response = await openai.chat.completions.create(
            {
              ...baseParams,
              max_tokens: maxTokens,
              max_completion_tokens: undefined
            },
            { signal: controller.signal as any }
          )
        } else {
          throw e
        }
      }

      clearTimeout(timeoutId)

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("Empty response from OpenAI")
      }

      return {
        content,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens
            }
          : undefined
      }
    } catch (error: any) {
      lastError = error

      // Don't retry on abort (timeout)
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeoutMs}ms`)
      }

      // Don't retry on non-retryable errors
      if (!isRetryableError(error) || attempt === retries) {
        throw error
      }

      // Wait before retry
      const delay = getRetryDelay(attempt)
      console.warn(
        `[MODEL] Retry attempt ${attempt + 1}/${retries} after ${delay}ms:`,
        error.message
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error("Model call failed")
}

/**
 * Call model and attempt to parse JSON response
 */
export interface CallModelJsonResult {
  ok: boolean
  json?: any
  raw: string
  error?: string
}

export async function callModelJson(
  prompt: string,
  systemPrompt?: string,
  options: CallModelOptions = {}
): Promise<CallModelJsonResult> {
  try {
    // First attempt: request JSON explicitly
    const enhancedPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text.`
    const result = await callModel(enhancedPrompt, systemPrompt, options)

    // Try to parse JSON
    try {
      // Remove markdown code blocks if present
      let cleaned = result.content.trim()
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "")
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "")
      }

      const json = JSON.parse(cleaned)
      return { ok: true, json, raw: result.content }
    } catch (parseError) {
      // If parse fails, try one more time with stricter instruction
      console.warn("[MODEL] JSON parse failed, retrying with stricter prompt")
      const strictPrompt = `${prompt}\n\nCRITICAL: You MUST return ONLY valid JSON. No text before or after. No markdown. No code blocks. Just pure JSON.`
      const retryResult = await callModel(strictPrompt, systemPrompt, {
        ...options,
        retries: 1
      })

      try {
        let cleaned = retryResult.content.trim()
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "")
        }

        const json = JSON.parse(cleaned)
        return { ok: true, json, raw: retryResult.content }
      } catch (retryParseError) {
        return {
          ok: false,
          raw: retryResult.content,
          error: `JSON parse failed: ${retryParseError}`
        }
      }
    }
  } catch (error: any) {
    return {
      ok: false,
      raw: "",
      error: error.message || "Model call failed"
    }
  }
}
