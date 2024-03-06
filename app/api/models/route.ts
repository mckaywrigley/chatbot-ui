import { ServerRuntime } from "next"
import { LLMID } from "@/types"

export const runtime: ServerRuntime = "edge"

let url = ""

export async function GET() {
  try {
    const modelIDs = []
    if (url == "") return Response.json({ modelIDs })

    // Get models from an url
    const models = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })

    if (!models.ok) return Response.json({ modelIDs })

    const data = await models.json()
    // Sanitize and add to array
    for (const model of data.data) {
      if (typeof model.id === "string") {
        modelIDs.push(sanitizeInput(model.id.trim()))
      }
    }
    modelIDs.sort()

    // Map array of models
    const allModels = [
      ...modelIDs.map(models => ({
        modelId: models as LLMID,
        modelName: models
      }))
    ]

    return Response.json({ allModels })

  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

function sanitizeInput(input: string): string {
  return input.replace(/[\u00A0-\u9999<>&]/gim, function (i) {
    return "&#" + i.charCodeAt(0) + ";"
  })
}

export async function POST(request: Request) {
  try {
    await request.json().then(data => (url = data.url + "/v1/models"))
    return new Response(JSON.stringify({ message: "success" }))
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
