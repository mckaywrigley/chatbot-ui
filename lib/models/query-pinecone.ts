import { OpenAIEmbeddings } from "langchain/embeddings/openai"

const queryPineconeVectorStore = async (
  question: string,
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

  const queryEmbedding = await embeddingsInstance.embedQuery(question)

  const PINECONE_QUERY_URL = `https://${config.index}-${config.projectId}.svc.${config.environment}.pinecone.io/query`

  const requestBody = {
    topK: 4,
    vector: queryEmbedding,
    includeMetadata: true,
    namespace: `${config.namespace}`
  }

  try {
    const response = await fetch(PINECONE_QUERY_URL, {
      method: "POST",
      headers: {
        "Api-Key": `${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    let matches = data.matches || []

    if (matches.length < 1) {
      return "None"
    }

    matches = matches.filter(
      (match: { score: number; metadata: { text: string | any[] } }) =>
        match.score > 0.82 &&
        match.metadata.text.length >= 250 &&
        match.metadata.text.length <= 5000
    )

    // Deduplicate matches based on their text content
    const uniqueMatches = matches.reduce(
      (acc: any[], current: { metadata: { text: string } }) => {
        const textExists = acc.find(
          item => item.metadata.text === current.metadata.text
        )
        if (!textExists) {
          acc.push(current)
        }
        return acc
      },
      []
    )

    let formattedResults = uniqueMatches
      .map(
        (match: { metadata: { text: any } }, index: any) =>
          `[CONTEXT ${index}]:\n${match.metadata.text}\n[END CONTEXT ${index}]\n\n`
      )
      .join("")

    // Ensure formattedResults does not exceed 7500 characters
    while (formattedResults.length > 7500) {
      let lastContextIndex = formattedResults.lastIndexOf("[CONTEXT ")
      if (lastContextIndex === -1) {
        break
      }
      formattedResults = formattedResults.substring(0, lastContextIndex).trim()
    }

    return formattedResults.length > 0 ? formattedResults : "None"
  } catch (error) {
    console.error(`Error querying Pinecone: ${error}`)
    return "None"
  }
}

export default queryPineconeVectorStore
