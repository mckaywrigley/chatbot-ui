// Import necessary functions and types
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"
import OpenAI from "openai"

// Specify the server runtime environment (edge server for reduced latency)
export const runtime: ServerRuntime = "edge"

// Async function to handle GET requests
export async function GET() {
  try {
    // Retrieve the server profile information (like API keys)
    const profile = await getServerProfile()
    
    // Validate the OpenAI API key
    checkApiKey(profile.openai_api_key, "OpenAI")
    
    // Initialize the OpenAI instance with the API key and organization ID
    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })
    
    // Fetch a list of up to 100 AI assistants
    const myAssistants = await openai.beta.assistants.list({
      limit: 100
    })

    // Return a successful response with the list of assistants in JSON format
    return new Response(JSON.stringify({ assistants: myAssistants.data }), {
      status: 200
    })
  } catch (error: any) {
    // Handle any errors that occur in the try block

     // Extract the error message; use a default message if not available
    const errorMessage = error.error?.message || "An unexpected error occurred"

    // Extract the error status code; default to 500 if not available
    const errorCode = error.status || 500

    // Return an error response with the message and status code
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
