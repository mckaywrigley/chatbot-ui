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

  let allText = docs.map(doc => doc.pageContent).join(" ")
  const words = allText.split(" ")

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const chunkTokens = encode(word).length
    if (tokens + chunkTokens <= TOKEN_LIMIT) {
      content += word + " "
      tokens += chunkTokens
    } else {
      chunks.push({
        content: content.trim(),
        tokens
      })
      content = word + " "
      tokens = chunkTokens
    }
  }

  if (content.trim() !== "") {
    chunks.push({
      content: content.trim(),
      tokens: encode(content).length
    })
  }

  return chunks
}
