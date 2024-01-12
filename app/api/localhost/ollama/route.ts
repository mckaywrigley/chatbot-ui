import { LLM, LLMID } from "@/types"

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV !== "production") {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_OLLAMA_URL + "/api/tags"
      )
      if (!response.ok) {
        throw new Error(`Ollama server is not responding.`)
      }
      const data = await response.json()
      const localModels = data.models.map((model: any) => {
        const newModel: LLM = {
          modelId: model.name as LLMID,
          modelName: model.name,
          provider: "ollama",
          hostedId: model.name,
          platformLink: "https://ollama.ai/library",
          imageInput: false
        }
        return newModel
      })
      return new Response(JSON.stringify({ localModels }))
    } catch (error) {
      throw error
    }
  } else {
    return new Response(JSON.stringify({ localModels: [] }))
  }
}
