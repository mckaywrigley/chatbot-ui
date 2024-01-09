import { LLM, LLMID } from "@/types"
import { exec } from "child_process"

export function GET(): Promise<Response> {
  if (process.env.NODE_ENV !== "production") {
    return new Promise((resolve, reject) => {
      exec("ollama serve", (error: any, stdout: any, stderr: any) => {})

      exec("ollama list", (error: any, stdout: any, stderr: any) => {
        if (error) {
          reject(error)
          return
        }

        if (stderr) {
          reject(new Error(stderr))
          return
        }

        const rows = stdout.split("\n")
        const dataRows = rows.slice(1, -1)
        const modelNames = dataRows.map((row: string) => row.split(/\s+/)[0])

        const localModels = modelNames.map((modelName: string) => {
          const model: LLM = {
            modelId: modelName as LLMID,
            modelName: modelName,
            provider: "ollama",
            hostedId: modelName,
            platformLink: "https://ollama.ai/library",
            imageInput: false
          }

          return model
        })

        resolve(new Response(JSON.stringify({ localModels })))
      })
    })
  } else {
    return new Promise(resolve => {
      resolve(new Response(JSON.stringify({ localModels: [] })))
    })
  }
}
