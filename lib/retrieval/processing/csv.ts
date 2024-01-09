import { FileItemChunk } from "@/types"
import { encode } from "gpt-tokenizer"

export const processCSV = async (csv: Blob): Promise<FileItemChunk[]> => {
  const fileBuffer = Buffer.from(await csv.arrayBuffer())
  const textDecoder = new TextDecoder("utf-8")
  const textContent = textDecoder.decode(fileBuffer)

  const rows = textContent.split("\n")
  const headerRow = rows[0]

  let chunks: FileItemChunk[] = []

  let content = ""
  let tokens = 0
  let metadata = { row: 0 }

  for (let i = 1; i < rows.length; i++) {
    // Check if row exists
    if (rows[i]) {
      const rowContent = rows[i]

      content += headerRow + "\n" + rowContent
      tokens += encode(content).length
      metadata = { row: i }

      chunks.push({ content, tokens })
    }
  }

  return chunks
}
