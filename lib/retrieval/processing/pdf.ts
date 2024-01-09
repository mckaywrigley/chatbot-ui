import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { PDFLoader } from "langchain/document_loaders/fs/pdf"
import { TOKEN_LIMIT } from "."

export const processPdf = async (pdf: Blob): Promise<FileItemChunk[]> => {
  const loader = new PDFLoader(pdf)
  const docs = await loader.load()

  let chunks: FileItemChunk[] = []

  let content = ""
  let tokens = 0
  const overlapSize = 50

  // Concatenate all the text together
  let allText = docs.map(doc => doc.pageContent).join(" ")

  // Split the text into chunks, filtering out empty strings
  const textChunks = allText.split(/\s+/).filter(chunk => chunk.length > 0)

  for (let i = 0; i < textChunks.length; i++) {
    const chunkTokens = encode(textChunks[i]).length

    if (tokens + chunkTokens > TOKEN_LIMIT) {
      // Push the current chunk
      chunks.push({
        content: content.trim(),
        tokens
      })

      // Start new chunk with overlap from previous chunk
      content = content.slice(-overlapSize) + " " + textChunks[i] + " "
      tokens = encode(content).length
    } else {
      content += textChunks[i] + " "
      tokens += chunkTokens
    }
  }

  // Push the last chunk if it's not empty
  if (content.trim() !== "") {
    chunks.push({
      content: content.trim(),
      tokens: encode(content).length
    })
  }

  return chunks
}
