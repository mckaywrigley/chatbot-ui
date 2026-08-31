import { getAzureOpenAIModel } from "@/lib/azure-openai"

export const runtime = "edge"

export async function GET() {
  try {
    const deployment = getAzureOpenAIModel()

    return new Response(JSON.stringify({ deployment }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    // If Azure env vars aren't configured, let the client fall back to model name.
    const message = error?.message || "Azure deployment not configured"
    return new Response(JSON.stringify({ message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }
}
