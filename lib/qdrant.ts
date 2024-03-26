import { v4 as uuidv4 } from "uuid"
import { QdrantClient } from "@qdrant/js-client-rest"
import { FileItemChunk } from "@/types"

interface FileItem {
  id: string
  vector: number[]
  payload: {
    file_id: string
    tokens: any // or replace 'any' with the appropriate type
    content: any // or replace 'any' with the appropriate type
  }
}
interface RetType {
  id: string | number
  file_id: any
  content: any
  tokens: any // I assumed it could be an array of any type
  similarity: number
}

export class qDrant {
  private qclient: QdrantClient

  constructor() {
    this.qclient = new QdrantClient({ url: "http://10.34.224.59:6333" })
  }
  public async addEmbeddings(
    user_id: string,
    embeddings: number[][],
    file_id: string,
    chunks: FileItemChunk[]
  ): Promise<FileItem[]> {
    try {
      await this.qclient.getCollection(user_id)
    } catch {
      await this.qclient.createCollection(user_id, {
        vectors: { size: embeddings[0].length, distance: "Dot" }
      })
    }
    const file_items = chunks.map((chunk, index) => ({
      id: uuidv4(),
      vector: embeddings[index],
      payload: {
        file_id: file_id,
        tokens: chunk.tokens,
        content: chunk.content
      }
    }))
    this.qclient.upsert(user_id, { wait: true, points: file_items })
    return file_items
  }
  public async searchEmbeddings(
    uniqueFileIds: string[],
    user_id: string,
    localEmbedding: number[]
  ): Promise<RetType[]> {
    const should = uniqueFileIds.map((x, index) => ({
      key: "file_id",
      match: { value: x }
    }))
    const result = await this.qclient.search(user_id, {
      vector: localEmbedding,
      filter: {
        should: should
      },
      with_payload: true
    })
    const ret = result.map((tmpDct, index) => ({
      id: tmpDct.id,
      file_id: tmpDct?.payload?.file_id,
      content: tmpDct?.payload?.content,
      tokens: tmpDct?.payload?.tokens,
      similarity: tmpDct.score
    }))
    return ret
  }
  public async deleteFile(user_id: string, fileId: string) {
    this.qclient.delete(user_id, {
      filter: {
        must: [
          {
            key: "file_id",
            match: {
              value: fileId
            }
          }
        ]
      }
    })
  }
}
