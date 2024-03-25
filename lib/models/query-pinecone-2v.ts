import { OpenAIEmbeddings } from "@langchain/openai"

interface PineconeQueryConfig {
  apiKey: string
  index: string
  projectId: string
  environment: string
  namespace?: string
  temperature: number
  messageLength: { min: number; max: number }
  pineconeNamespace?: string
}

class PineconeRetriever {
  private embedModel: OpenAIEmbeddings
  private config: PineconeQueryConfig
  private similarityTopK: number

  constructor(
    openAIApiKey: string | undefined,
    config: PineconeQueryConfig,
    similarityTopK: number = 3
  ) {
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is required.")
    }
    // Ensure all required config properties are initialized.
    if (
      !config.apiKey ||
      !config.index ||
      !config.projectId ||
      !config.environment
    ) {
      throw new Error("Pinecone configuration is missing required properties.")
    }

    this.embedModel = new OpenAIEmbeddings({
      openAIApiKey: openAIApiKey,
      modelName: "text-embedding-3-large",
      dimensions: 1536
    })
    this.config = config
    this.similarityTopK = similarityTopK
  }

  async retrieve(question: string): Promise<string> {
    const queryEmbedding = await this.embedModel.embedQuery(question)
    const PINECONE_QUERY_URL = `https://${this.config.index}-${this.config.projectId}.svc.${this.config.environment}.pinecone.io/query`
    const requestBody = {
      vector: queryEmbedding,
      topK: this.similarityTopK,
      includeMetadata: true,
      namespace: this.config.namespace
    }

    try {
      const response = await fetch(PINECONE_QUERY_URL, {
        method: "POST",
        headers: {
          "Api-Key": this.config.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      // Filter out matches with scores below 0.52
      const highScoreMatches = data.matches.filter((match: any) => {
        if (match.score <= 0.52) return false
        const nodeContent = JSON.parse(match.metadata._node_content)
        const textContent = nodeContent.text
        return textContent.length >= 200
      })

      // Remove duplicates based on nodeContent.text
      const uniqueMatches = highScoreMatches.reduce(
        (acc: any[], match: any) => {
          const nodeContent = JSON.parse(match.metadata._node_content)
          const textContent = nodeContent.text
          if (
            !acc.find(
              m => JSON.parse(m.metadata._node_content).text === textContent
            )
          ) {
            acc.push(match)
          }
          return acc
        },
        []
      )

      // Map the filtered and unique matches to the specified format
      let formattedResults = uniqueMatches
        .map((match: any, index: number) => {
          // Parse the _node_content string to access its properties
          const nodeContent = JSON.parse(match.metadata._node_content)
          // Extract the `text` property
          const textContent = nodeContent.text

          // Format the `text` content within the specified structure
          return `[CONTEXT ${index}]:\n${textContent}\n[END CONTEXT ${index}]\n\n`
        })
        .join("")

      return formattedResults.length > 0 ? formattedResults : "None"
    } catch (error) {
      console.error(`Error querying Pinecone: ${error}`)
      return "Error retrieving data"
    }
  }
}

export default PineconeRetriever
