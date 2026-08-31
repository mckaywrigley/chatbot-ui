/**
 * POST /api/chat/title
 *
 * Generates a 1-3 word noun-phrase title from the user's first chat
 * message. Called once per new chat by `handleCreateChat` so the
 * slab in the chat list reads as "Viscosity dilution check" instead
 * of the first 100 characters of the user's question.
 *
 * Best-effort - the route returns `{title: null}` on any error and
 * the caller falls back to first-three-words.
 */

import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import {
  getAzureOpenAIForDesign,
  getDesignDeployment
} from "@/lib/azure-openai"
import { createClient } from "@/lib/supabase/server"
import { recordCompletionUsage } from "@/lib/billing/account"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const supabase = createClient(cookies())
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ title: null }, { status: 401 })
  }

  let body: { message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ title: null }, { status: 400 })
  }
  const message = (body.message ?? "").trim()
  if (!message) {
    return NextResponse.json({ title: null }, { status: 400 })
  }

  try {
    const openai = getAzureOpenAIForDesign()
    const completion = await openai.chat.completions.create({
      model: getDesignDeployment(),
      temperature: 0.2,
      // Hard cap so the model can't ramble. 16 tokens is comfortably
      // under our 3-word, ≤ 80-char target with headroom for short
      // words like "&".
      max_tokens: 16,
      messages: [
        {
          role: "system",
          content:
            "You generate a 1-3 word title summarising the topic of a user's first chat message. Return JUST the title, no punctuation, no quotes, no leading/trailing words like 'Title:'. Title-case the first word; the rest lowercase. If the message is genuinely too vague to title, return 'Untitled chat'."
        },
        { role: "user", content: message.slice(0, 600) }
      ]
    })
    await recordCompletionUsage(
      {
        userId: session.user.id,
        feature: "title",
        model: getDesignDeployment()
      },
      completion
    )
    let raw = completion.choices[0]?.message?.content ?? ""
    raw = raw.replace(/^[\s"'`*#-]+|[\s"'`*#-]+$/g, "").trim()
    if (!raw) {
      return NextResponse.json({ title: null })
    }
    return NextResponse.json({ title: raw.slice(0, 80) })
  } catch (e: any) {
    console.warn("[chat-title] failed:", e?.message ?? e)
    return NextResponse.json({ title: null })
  }
}
