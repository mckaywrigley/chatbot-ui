/**
 * /api/debug/azure-probe - runtime diagnostic for the Azure OpenAI design
 * deployment. Reports back: which deployment / endpoint / api-version are in
 * effect, plus the actual results of three real model calls (basic, beta
 * parse with json_schema, max_tokens fallback). Goal is to surface the
 * exact error string when production lit-scout returns empty silently.
 *
 * Gated by a shared-secret query param so it's not openly exposed:
 *   GET /api/debug/azure-probe?secret=<DEBUG_PROBE_SECRET>
 *
 * Set DEBUG_PROBE_SECRET in env (any non-empty string) to enable. Returns
 * 404 if not configured. Remove this route once gpt-5.5 prod is healthy.
 */

import { NextResponse } from "next/server"

import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ProbeResult {
  label: string
  ok: boolean
  durationMs: number
  // Truncated fragments so we never accidentally dump secrets / massive
  // payloads. The full error is logged to the function console (Vercel
  // runtime logs) for the operator to pull out.
  detail?: string
  errorStatus?: number
  errorCode?: string
  errorMessage?: string
}

async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  detail: (r: T) => string
): Promise<ProbeResult> {
  const start = Date.now()
  try {
    const r = await fn()
    return {
      label,
      ok: true,
      durationMs: Date.now() - start,
      detail: detail(r).slice(0, 240)
    }
  } catch (e: any) {
    // Log the full error to Vercel runtime logs - surfaces the exact
    // unsupported_value / 404 / auth failure for diagnosis.
    console.error(`[azure-probe] ${label} FAILED`, {
      status: e?.status,
      code: e?.error?.code ?? e?.code,
      message: e?.message,
      param: e?.error?.param,
      type: e?.error?.type
    })
    return {
      label,
      ok: false,
      durationMs: Date.now() - start,
      errorStatus: e?.status,
      errorCode: e?.error?.code ?? e?.code,
      errorMessage: String(e?.message ?? e).slice(0, 400)
    }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get("secret")
  const expected = process.env.DEBUG_PROBE_SECRET
  if (!expected) {
    return NextResponse.json({ error: "probe not configured" }, { status: 404 })
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const deployment = (() => {
    try {
      return getDesignDeployment()
    } catch (e: any) {
      return `<getDesignDeployment threw: ${e?.message}>`
    }
  })()

  const env = {
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT ?? null,
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION ?? null,
    AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT ?? null,
    AZURE_OPENAI_DESIGN_DEPLOYMENT:
      process.env.AZURE_OPENAI_DESIGN_DEPLOYMENT ?? null,
    // Just length / fingerprint, never the key itself.
    AZURE_OPENAI_KEY_state: ((): string => {
      const k = process.env.AZURE_OPENAI_KEY ?? process.env.AZURE_OPENAI_API_KEY
      if (!k) return "MISSING"
      const s = k.trim()
      if (s.length < 8) return `SHORT (length=${s.length})`
      return `PRESENT (length=${s.length}, fp=${s.slice(0, 2)}…${s.slice(-2)})`
    })(),
    resolvedDesignDeployment: deployment
  }

  // Each call passes a non-1 temperature on purpose - confirms the shim
  // coerces it (this is the runtime equivalent of the local probe).
  const client = getAzureOpenAIForDesign()
  const model = deployment

  const tests: ProbeResult[] = []

  tests.push(
    await timed(
      "1. chat.completions.create with caller temp=0.3",
      () =>
        client.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: 'reply with the word "ok1" and nothing else'
            }
          ],
          temperature: 0.3,
          max_completion_tokens: 20
        }),
      r =>
        `content="${r.choices[0]?.message?.content}" finish=${r.choices[0]?.finish_reason}`
    )
  )

  tests.push(
    await timed(
      "2. beta.chat.completions.parse with json_schema",
      () =>
        client.beta.chat.completions.parse({
          model,
          messages: [
            { role: "user", content: 'Return JSON: { "ok": true, "n": 5 }' }
          ],
          temperature: 0.5,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "probe",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["ok", "n"],
                properties: {
                  ok: { type: "boolean" },
                  n: { type: "number" }
                }
              }
            }
          }
        }),
      r =>
        `parsed=${JSON.stringify(r.choices[0]?.message?.parsed)} content="${r.choices[0]?.message?.content?.slice(0, 80)}"`
    )
  )

  tests.push(
    await timed(
      "3. chat.completions.create with legacy max_tokens",
      () =>
        client.chat.completions.create({
          model,
          messages: [{ role: "user", content: "say ok" }],
          temperature: 0.7,
          max_tokens: 15
        } as any),
      r => `content="${r.choices[0]?.message?.content}"`
    )
  )

  const allOk = tests.every(t => t.ok)

  return NextResponse.json({
    allOk,
    env,
    tests
  })
}
