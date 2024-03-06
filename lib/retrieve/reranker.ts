// Reranker implementation from https://medium.com/@foadmk/enhancing-data-retrieval-with-vector-databases-and-gpt-3-5-reranking-c58ec6061bde

import OpenAI from "openai"
import {
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions.mjs"

export const reranker = async (
  openai: OpenAI,
  input: string,
  chunks: any[],
  sourceCount: number,
  model: ChatCompletionCreateParamsBase["model"]
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
\`\`\`
{id},{5-words Rationale},{Relevance},{Completeness},{Reliability},{Total}
\`\`\`
One item per line.`

  const messages = [
    { role: "system", content: prompt },
    {
      role: "user",
      content:
        `The question is: ${input}\n\nThe contents are:\n\n` +
        JSON.stringify(
          chunks.map(chunk => ({ id: chunk.id, content: chunk.content }))
        )
    }
  ] as ChatCompletionMessageParam[]

  const enrichResponseCall = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0,
    max_tokens: 4096,
    stream: false
  })

  const result = enrichResponseCall.choices[0].message.content

  console.log({ result })

  // go through the result and parse the chunks
  const lines = result?.split("\n")
  const chunksWithScores = lines?.map(line => {
    const [id, rationale, relevance, completeness, reliability, total] =
      line.split(",")
    return {
      id,
      rationale,
      relevance: parseInt(relevance),
      completeness: parseInt(completeness),
      reliability: parseInt(reliability),
      total: parseInt(total)
    }
  })

  // return top sourceCount chunks by total
  const topChunksIds = chunksWithScores
    ?.sort((a, b) => b.total - a.total)
    ?.slice(0, sourceCount)
    .map(chunk => chunk.id)

  return chunks?.filter(chunk => topChunksIds?.includes(chunk.id))
}
