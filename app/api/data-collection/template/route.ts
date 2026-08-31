import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

// TODO: Replace mock with real OpenAI-based template generation once API keys are configured
const USE_MOCK = true

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await assertBudget(user.id)
    } catch (e) {
      if (isBudgetExceededError(e)) return budgetErrorResponse(e.plan)
    }

    const { protocolFileId, dataCollectionName, description } =
      await request.json()

    if (USE_MOCK) {
      // Return a sensible default template based on whether a protocol was provided
      const columns = protocolFileId
        ? [
            "Sample ID",
            "Date",
            "Condition",
            "Time Point",
            "Measurement 1",
            "Measurement 2",
            "Temperature (°C)",
            "pH",
            "Notes"
          ]
        : ["Sample ID", "Date", "Parameter", "Value", "Unit", "Notes"]

      const emptyRow = columns.map(() => "")
      const rows = [
        [...emptyRow],
        [...emptyRow],
        [...emptyRow],
        [...emptyRow],
        [...emptyRow]
      ]

      return NextResponse.json({
        columns,
        rows,
        description: protocolFileId
          ? `Data entry template for ${dataCollectionName || "experiment"} based on protocol`
          : `General data entry template for ${dataCollectionName || "experiment"}`
      })
    }

    // --- Real implementation (currently disabled) ---
    const { getAzureOpenAI, getAzureOpenAIModel } = await import(
      "@/lib/azure-openai"
    )
    const { resolveSupabaseFilesToText } = await import(
      "@/lib/report/file-content"
    )

    if (!protocolFileId) {
      return NextResponse.json(
        { error: "Protocol file ID is required" },
        { status: 400 }
      )
    }

    const resolved = await resolveSupabaseFilesToText([protocolFileId], {
      maxCharsPerFile: 40_000
    })

    const protocolText = resolved[0]?.content
    if (!protocolText) {
      return NextResponse.json(
        { error: "Could not read protocol file content" },
        { status: 400 }
      )
    }

    const openai = getAzureOpenAI()
    const modelName = getAzureOpenAIModel()

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: `You are a data structuring assistant for a biopharma research lab. You are given a protocol document. Your job is to analyze the protocol and determine what data columns a scientist would need to record when running this experiment.

Create an empty template table structure with:
1. Appropriate column headers based on the protocol's measurements, conditions, time points, and expected observations
2. Include columns for: sample/condition identifiers, time points (if applicable), all measured parameters mentioned in the protocol, and any relevant metadata columns (like date, operator, notes)
3. Include proper units in column headers where applicable (e.g., "Temperature (°C)", "Concentration (mg/mL)")
4. Add a few empty placeholder rows (3-5) to show the expected structure

Return ONLY a valid JSON object with this exact structure:
{
  "columns": ["Column1 (unit)", "Column2 (unit)", ...],
  "rows": [["", "", ...], ["", "", ...], ["", "", ...]],
  "description": "Brief description of what data this template captures"
}

Important:
- Infer the best column names from the protocol
- Include standard lab data columns (Sample ID, Date, etc.)
- Put units in parentheses in the column header
- The rows should be empty strings to serve as a template
- Keep columns focused and relevant - typically 5-12 columns`
        },
        {
          role: "user",
          content: `Protocol document:\n\n${protocolText}\n\nData collection name: ${dataCollectionName || "Untitled"}\nDescription: ${description || "N/A"}\n\nPlease generate an empty data entry template based on this protocol.`
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })

    await recordCompletionUsage(
      { userId: user.id, feature: "data_collection", model: modelName },
      completion
    )

    const responseText = completion.choices[0]?.message?.content || ""
    let parsed: any

    try {
      parsed = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: "Failed to parse template response" },
        { status: 500 }
      )
    }

    const result = {
      columns: parsed.columns || [],
      rows: parsed.rows || [[]],
      description: parsed.description || ""
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[DATA_TEMPLATE_API] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate template" },
      { status: 500 }
    )
  }
}
