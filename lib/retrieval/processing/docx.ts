import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

export const processDocX = async (text: string): Promise<FileItemChunk[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 4000,
    chunkOverlap: 400
  })
  const splitDocs = await splitter.createDocuments([text])

  let chunks: FileItemChunk[] = []

  for (let i = 0; i < splitDocs.length; i++) {
    const doc = splitDocs[i]

    chunks.push({
      content: doc.pageContent,
      tokens: encode(doc.pageContent).length
    })
  }

  return chunks
}
