import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { CHUNK_OVERLAP, CHUNK_SIZE } from "."

export const processMarkdown = async (
  markdown: Blob, prepend: string = ""
): Promise<FileItemChunk[]> => {
  const fileBuffer = Buffer.from(await markdown.arrayBuffer())
  const textDecoder = new TextDecoder("utf-8")
  const textContent = textDecoder.decode(fileBuffer)

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP
  })

  const splitDocs = await splitter.createDocuments([textContent])

  let chunks: FileItemChunk[] = []

  for (let i = 0; i < splitDocs.length; i++) {
    const doc = splitDocs[i]

    const finalContent = prepend + (prepend?.length>0 ? "\n\n" : "") + doc.pageContent
    chunks.push({
      content: finalContent,
      tokens: encode(finalContent).length
    })
  }

  return chunks
}
