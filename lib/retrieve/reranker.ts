// Reranker implementation from https://medium.com/@foadmk/enhancing-data-retrieval-with-vector-databases-and-gpt-3-5-reranking-c58ec6061bde

import { decode, encode } from "gpt-tokenizer"
import OpenAI from "openai"
import {
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions.mjs"

export const reranker = async (
  openai: OpenAI,
  input: string,
  rephrasedUserInput: string,
  chunks: any[],
  sourceCount: number,
  model: ChatCompletionCreateParamsBase["model"],
  maxContextSize: number
) => {
  const prompt = `You are a re-ranker assistant tasked with evaluating a set of content items in relation to a specific question. Your role involves critically analyzing each content item to determine its relevance to the question and re-ranking them accordingly. This process includes assigning a relevance score from 0 to 10 to each content item based on how well it answers the question, its coverage of the topic, and the reliability of its information.
To achieve your goal, use the following guidelines:

# Scoring Criteria Definition:
- Relevance to the Question: How directly does the content item address the user's question?
- Completeness of the Answer: Does the content item provide comprehensive information that answers the user's question?
- Reliability of the Information: Is the content item from a credible and trustworthy source, or does it provide accurate and verified information?

# Re-ranking and Output
List the content items in descending order of their relevance scores in the requested format. This re-ranked list should start with the content item that is most relevant to the question and end with the least relevant. Output only the list.

The list format is:
\`\`\`markdown
| UUID | 5-words Rationale | Relevance | Completeness | Reliability | Total |
|-|-|-|-|-|-|
| 123e4567-e89b-12d3-a456-426614174000 | FlexNet advances predictive analytics in network management, enhancing operational efficiency. | 8 | 9 | 9 | 26 |
| 789e0123-f34c-56d7-a789-528e640f1234 | GraphAI introduces novel graph-based learning for bioinformatics, revolutionizing data analysis. | 9 | 8 | 8 | 25 |
| 456f7890-12d3-45b6-789a-bcdef1234567 | QuantumBridge pioneers in quantum encryption methods, ensuring unparalleled security. | 9 | 9 | 8 | 26 |
| abcdef12-3456-789a-bcde-f01234567890 | EcoSim offers breakthroughs in ecological modeling, aiding climate change research. | 7 | 8 | 8 | 23 |
\`\`\`

Output the list of content items in the requested format.
`
  //calculate the total number of tokens in the prompt and the input
  const promptTokens = encode(prompt).length

  //calculate the number of tokens in the chunks
  const chunksTokens = chunks.reduce((acc, chunk) => {
    return acc + chunk.tokens + 60
  }, 0)

  const inputTokens = encode(input).length
  const totalReturnTokens = 2048
  const safeGuardTokens = 200

  let trimmedChunks = JSON.parse(JSON.stringify(chunks))

  console.log({
    promptTokens,
    chunksTokens,
    chunksQt: chunks.length,
    chunksMax: chunks.reduce((acc, chunk) => Math.max(acc, chunk.tokens), 0),
    chunksMin: chunks.reduce(
      (acc, chunk) => Math.min(acc, chunk.tokens),
      1000000
    ),
    averageChunkTokens: chunksTokens / chunks.length,
    totalReturnTokens,
    inputTokens,
    safeGuardTokens
  })

  const execessTokens =
    promptTokens +
    chunksTokens +
    totalReturnTokens +
    inputTokens +
    safeGuardTokens -
    maxContextSize

  if (execessTokens > 0) {
    const chunksTokensToBeRemoved = execessTokens / chunksTokens

    console.log({ chunksTokensToBeRemoved })

    trimmedChunks = chunks.map(chunk => {
      const encodedContent = encode(chunk.content)
      const trimmedContent = encodedContent.slice(
        0,
        Math.floor(encodedContent.length * (1 - chunksTokensToBeRemoved))
      )
      return {
        ...chunk,
        content: decode(trimmedContent)
      }
    })
  }

  const messages = [
    { role: "system", content: prompt },
    {
      role: "user",
      content:
        `The original question is: ${input}\n\n` +
        (rephrasedUserInput !== input
          ? `The rephrased question is: ${rephrasedUserInput}\n\n`
          : "") +
        `The contents are:\n\n` +
        trimmedChunks
          .map((chunk: { id: any; content: any }) => {
            return `<ContentID=${chunk.id}>${chunk.content.replace("|", "")}</ContentID=${chunk.id}>`
          })
          .join("\n\n")
    }
  ] as ChatCompletionMessageParam[]

  const enrichResponseCall = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
    max_tokens: totalReturnTokens,
    stream: false
  })

  const result = enrichResponseCall.choices[0].message.content
  // go through the result and parse the chunks
  const lines = result?.split("\n")
  const chunksWithScores = lines?.map(line => {
    const [_0, id, rationale, relevance, completeness, reliability, total, _1] =
      line.split("|")
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!id || !uuidRegex.test(id.trim())) return

    return {
      id: id.trim(),
      rationale: rationale.trim(),
      relevance: parseFloat(relevance.trim()),
      completeness: parseFloat(completeness.trim()),
      reliability: parseFloat(reliability.trim()),
      total: parseFloat(total.trim())
    }
  })

  // return top sourceCount chunks by total, ensuring all elements are defined
  const topChunksIds = chunksWithScores
    ?.filter(ret => ret?.total && ret?.total > 0)
    .sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0))
    .slice(0, sourceCount)
    .map(chunk => chunk?.id)

  return chunks?.filter(chunk => topChunksIds?.includes(chunk?.id))
}
