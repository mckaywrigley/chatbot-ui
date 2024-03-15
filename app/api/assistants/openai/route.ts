import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"
import OpenAI from "openai"

export const runtime: ServerRuntime = "edge"

export async function GET() {
  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id,
	  baseURL: "https://gateway.ai.cloudflare.com/v1/a03197fe72510387a4b4e9f7f3595e47/open-ai/openai"
    })

    const myAssistants = await openai.beta.assistants.list({
      limit: 100
    })

    return new Response(JSON.stringify({ assistants: myAssistants.data }), {
      status: 200
    })
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
