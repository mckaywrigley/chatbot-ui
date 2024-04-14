import { OpenAIEmbeddings } from "@langchain/openai"
import { CohereClient } from "cohere-ai"

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

interface CohereRerankConfig {
  apiKey: string
  rerank: boolean
}

class RetrieverReranker {
  private embedModel: OpenAIEmbeddings
  private similarityTopK: number
  private pineconeConfig: PineconeQueryConfig
  private cohereConfig: CohereRerankConfig

  private textCleaner(text: string): string {
    return text
      .replace(/\[([^\]]+)\]\((?!http)(.*?)\)/g, "$1")
      .replace(/{% content-ref url="[^"]+" %}.*?{% endcontent-ref %}/gs, "")
  }

  private textBuilder(match: {
    metadata: {
      _node_content: string
      document_title: string
      section_summary: string
    }
  }): string {
    const nodeContent = JSON.parse(match.metadata._node_content)
    return (
      match.metadata.document_title +
      "\n\n" +
      match.metadata.section_summary +
      "\n\n" +
      this.textCleaner(nodeContent.text)
    )
  }

  constructor(
    openAIApiKey: string | undefined,
    pineconeConfig: PineconeQueryConfig,
    cohereConfig: CohereRerankConfig,
    similarityTopK: number
  ) {
    if (!openAIApiKey) {
      throw new Error("OpenAI API key is required.")
    }
    // Ensure all required config properties are initialized.
    if (
      !pineconeConfig.apiKey ||
      !pineconeConfig.index ||
      !pineconeConfig.projectId ||
      !pineconeConfig.environment
    ) {
      throw new Error("Pinecone configuration is missing required properties.")
    }

    this.embedModel = new OpenAIEmbeddings({
      openAIApiKey: openAIApiKey,
      modelName: "text-embedding-3-large",
      dimensions: 3072
    })
    this.cohereConfig = cohereConfig
    this.pineconeConfig = pineconeConfig
    this.similarityTopK = similarityTopK
  }

  async retrieve(question: string): Promise<string> {
    // Adjusted RegExp to match both closed and unclosed <Standalone Question> tags
    const standaloneQuestionRegExp =
      /<Standalone Question>(.*?)<\/?Standalone Question>/gs
    const matches = question.match(standaloneQuestionRegExp)
    const docsToEmbed = matches
      ? matches.map(match => match.replace(/<\/?Standalone Question>/g, ""))
      : [question]
    // console.log("docsToEmbed: ", docsToEmbed)
    const queryEmbedding = await this.embedModel.embedDocuments(docsToEmbed)

    const PINECONE_QUERY_URL = `https://${this.pineconeConfig.index}-${this.pineconeConfig.projectId}.svc.${this.pineconeConfig.environment}.pinecone.io/query`

    const retrievedData: any[] = []

    for (const query of queryEmbedding) {
      const requestBody = {
        vector: query,
        topK: this.similarityTopK,
        includeMetadata: true,
        namespace: this.pineconeConfig.namespace
      }

      try {
        const response = await fetch(PINECONE_QUERY_URL, {
          method: "POST",
          headers: {
            "Api-Key": this.pineconeConfig.apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        retrievedData.push(...data.matches)
      } catch (error) {
        console.error(`Error querying Pinecone: ${error}`)
      }
    }

    retrievedData.sort((a, b) => b.score - a.score)

    // Remove duplicates based on nodeContent.text
    const uniqueMatches = retrievedData.reduce((acc: any[], match: any) => {
      const textContent = this.textBuilder(match)
      if (!acc.find(m => this.textBuilder(m) === textContent)) {
        acc.push(match)
      }
      return acc
    }, [])

    if (this.cohereConfig.rerank) {
      const cohere = new CohereClient({
        token: this.cohereConfig.apiKey
      })
      const uniqueMatchesText = uniqueMatches.map((match: any) => {
        return this.textBuilder(match)
      })

      const isolatedQuestion =
        question
          .match(/<Standalone Question>(.*?)<\/?Standalone Question>/)?.[1]
          ?.trim() || question

      // Rerank the chunks using cohere
      const rerankedMatches = await cohere.rerank({
        model: "rerank-english-v3.0",
        documents: uniqueMatchesText.map((d: any) => ({
          text: d
        })),
        query: isolatedQuestion,
        topN: this.similarityTopK
      })

      const cohereFormattedResults = rerankedMatches.results
        .map((result: any, index: number) => {
          return `[CONTEXT ${index}]:${uniqueMatchesText[result.index]}\n[END CONTEXT ${index}]\n\n`
        })
        .join("")

      // Remove incomplete or relative markdown links
      // console.log("Cohere results: ", cohereFormattedResults)

      return cohereFormattedResults.length > 0 ? cohereFormattedResults : "None"
    }

    // Filter out matches with scores below 0.5
    const highScoreMatches = uniqueMatches.filter((match: any) => {
      if (match.score <= 0.5) return false
      const nodeContent = JSON.parse(match.metadata._node_content)
      const textContent = nodeContent.text
      return textContent.length >= 70 && textContent.length <= 5000
    })

    // Map the filtered and unique matches to the specified format
    let formattedResults = highScoreMatches
      .slice(0, this.similarityTopK)
      .map((match: any, index: number) => {
        const textContent = this.textBuilder(match)

        // Format the `text` content within the specified structure
        return `[CONTEXT ${index}]:\n${textContent}\n[END CONTEXT ${index}]\n\n`
      })
      .join("")

    // Log the question, data, and formatted results for debugging
    // console.log("Formatted results: ", formattedResults)
    return formattedResults.length > 0 ? formattedResults : "None"
  }
}

export default RetrieverReranker
