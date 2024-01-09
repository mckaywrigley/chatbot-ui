import { LLM, LLMID } from "@/types";

export function GET(): Promise<Response> {
  return new Promise((resolve, reject) => {
    fetch(process.env.NEXT_PUBLIC_OLLAMA_URL + "/api/tags")
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ollama server is not responding.`);
        }
        return response.json();
      })
      .then(data => {
        const localModels = data.models.map((model: any) => {
          const newModel: LLM = {
            modelId: model.name as LLMID,
            modelName: model.name,
            provider: "ollama",
            hostedId: model.name,
            platformLink: "https://ollama.ai/library",
            imageInput: false
          };
          return newModel;
        });
        resolve(new Response(JSON.stringify({ localModels })));
      })
      .catch(error => {
        reject(error);
      });
  });
}
