import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"
import { PDFLoader } from "langchain/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

export const processPdf = async (pdf: Blob): Promise<FileItemChunk[]> => {
  const loader = new PDFLoader(pdf)
  const docs = await loader.load()
  let completeText = docs.map(doc => doc.pageContent).join(" ")
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 4000,
    chunkOverlap: 400
  })
  const splitDocs = await splitter.createDocuments([completeText])

  let chunks: FileItemChunk[] = []

  console.log(splitDocs, "splitDocs:", splitDocs.length)
  splitDocs.forEach(doc => {
    const docTokens = encode(doc.pageContent).length
    console.log(
      `Content length: ${doc.pageContent.length}, Tokens: ${docTokens}`
    )
  })

  for (let i = 0; i < splitDocs.length; i++) {
    const doc = splitDocs[i]

    chunks.push({
      content: doc.pageContent,
      tokens: encode(doc.pageContent).length
    })
  }

  return chunks
}
