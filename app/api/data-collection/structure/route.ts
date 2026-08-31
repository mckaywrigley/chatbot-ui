import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getAzureOpenAI, getAzureOpenAIModel } from "@/lib/azure-openai"
import { assertBudget, recordCompletionUsage } from "@/lib/billing/account"
import {
  budgetErrorResponse,
  isBudgetExceededError
} from "@/lib/billing/errors"

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

    const { messages, dataCollectionId } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      )
    }

    const openai = getAzureOpenAI()
    const modelName = getAzureOpenAIModel()

    const rawData = messages.join("\n---\n")

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: `You are a data structuring assistant for a biopharma research lab. Your job is to take raw, unstructured experimental data entries and convert them into a clean, structured CSV format.

Rules:
1. Analyze all the data entries to identify common fields/columns
2. Create consistent column headers
3. Parse each entry into rows matching those columns
4. Use empty strings for missing values
5. Keep numeric values as numbers (no units in the value column - put units in the column header if applicable)
6. Return ONLY a valid JSON object with this exact structure:
{
  "format": "csv",
  "fileName": "data_collection.csv",
  "columns": ["Column1", "Column2", ...],
  "rows": [["val1", "val2", ...], ...],
  "csvContent": "Column1,Column2,...\\nval1,val2,...\\n..."
}

Important:
- Infer the best column names from the data
- Standardize units across entries
- Parse dates to ISO format if found
- If data contains condition labels (like C0, E1, etc.), include a Condition column`
        },
        {
          role: "user",
          content: `Please structure the following raw experimental data entries into a CSV:\n\n${rawData}`
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
        { error: "Failed to parse structured response" },
        { status: 500 }
      )
    }

    const result = {
      format: parsed.format || "csv",
      content: parsed.csvContent || "",
      fileName: parsed.fileName || "data_collection.csv",
      columns: parsed.columns || [],
      preview: (parsed.rows || []).slice(0, 50) // Cap preview at 50 rows
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[DATA_STRUCTURE_API] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to structure data" },
      { status: 500 }
    )
  }
}
