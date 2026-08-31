import { NextResponse } from "next/server"
import { getAzureOpenAIForDeployment } from "@/lib/azure-openai"
import { requireUser } from "@/lib/server/require-user"
import { checkRateLimit } from "@/lib/server/rate-limit"
import { enforceSize, sniffAndValidate } from "@/lib/server/file-validation"
import { assertBudget, recordUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"
import { estimateTextTokens } from "@/lib/billing/estimate"

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const limited = await checkRateLimit({
      name: "transcribe",
      identifier: auth.user.id,
      requests: 30,
      window: "1 h"
    })
    if (limited) return limited

    // Whisper is operator-paid (Azure). Gate it on the user's budget like every
    // other AI route (no-ops in metering-only mode; blocks only when
    // BILLING_ENFORCE is on and the user is out of credits).
    try {
      await assertBudget(auth.user.id)
    } catch (e: any) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    const sizeError = enforceSize(audioFile.size, "audio")
    if (sizeError) return sizeError

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const mimeError = await sniffAndValidate(
      audioBuffer,
      "audio",
      audioFile.type,
      audioFile.name
    )
    if (mimeError) return mimeError

    const whisperDeployment = process.env.AZURE_WHISPER_DEPLOYMENT || "whisper"
    const openai = getAzureOpenAIForDeployment(whisperDeployment)

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: whisperDeployment
    })

    // Whisper returns no token usage, so estimate a token-equivalent to charge
    // against credits - the larger of the transcript token estimate and a floor
    // derived from audio size - so transcription is no longer a free path.
    // Best-effort: recordUsage never throws into the response.
    await recordUsage({
      userId: auth.user.id,
      feature: "data_collection",
      totalTokens: Math.max(
        estimateTextTokens(transcription.text),
        Math.ceil(audioFile.size / 1500)
      ),
      model: whisperDeployment
    })

    return NextResponse.json({
      text: transcription.text
    })
  } catch (error: any) {
    console.error("[TRANSCRIBE_API] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to transcribe audio" },
      { status: 500 }
    )
  }
}
