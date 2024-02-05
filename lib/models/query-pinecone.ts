import { OpenAIEmbeddings } from "langchain/embeddings/openai"

const queryPineconeVectorStore = async (
  query: string,
  openAIApiKey: string | undefined,
  config: {
    apiKey: any
    index: any
    projectId: any
    environment: any
    namespace?: string | undefined
    temperature?: number
    messageLength?: { min: number; max: number }
    pineconeNamespace?: any
  }
) => {
  const embeddingsInstance = new OpenAIEmbeddings({
    openAIApiKey: openAIApiKey
  })

  const queryEmbedding = await embeddingsInstance.embedQuery(query)

  const PINECONE_QUERY_URL = `https://${config.index}-${config.projectId}.svc.${config.environment}.pinecone.io/query`

  const requestBody = {
    topK: 5,
    vector: queryEmbedding,
    includeMetadata: true,
    namespace: config.namespace
  }

  try {
    const response = await fetch(PINECONE_QUERY_URL, {
      method: "POST",
      headers: {
        "Api-Key": config.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const matches = data.matches || []

    if (matches.length < 3) {
      return "None"
    }

    const filteredMatches = matches.filter(
      (match: { score: number; metadata: { text: string | any[] } }) =>
        match.score > 0.8 && match.metadata.text.length >= 250
    )

    if (filteredMatches.length > 0) {
      return filteredMatches
        .map(
          (match: { metadata: { text: any } }, index: any) =>
            `[CONTEXT ${index}]:\n${match.metadata.text}\n[END CONTEXT ${index}]\n\n`
        )
        .join("")
    } else {
      return "None"
    }
  } catch (error) {
    console.error(`Error querying Pinecone: ${error}`)
    return "None"
  }
}

export default queryPineconeVectorStore
