import { generateLocalEmbedding } from "@/lib/generate-local-embedding"
import {
  getAzureOpenAIEmbeddingsClient,
  getAzureOpenAIEmbeddingsDeployment
} from "@/lib/azure-openai"
import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"

export async function retrieveRelevantContent(
  userInput: string,
  fileIds: string[],
  embeddingsProvider: "openai" | "local",
  sourceCount: number = 3 // Default to 3
) {
  const uniqueFileIds = [...new Set(fileIds)]
  if (uniqueFileIds.length === 0) return []

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    let chunks: any[] = []

    if (embeddingsProvider === "openai") {
      const embeddingsDeployment =
        profile.azure_openai_embeddings_id ||
        getAzureOpenAIEmbeddingsDeployment()
      if (!embeddingsDeployment) {
        throw new Error(
          "Azure embeddings deployment not configured. Set AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT or configure azure_openai_embeddings_id."
        )
      }

      const openai = getAzureOpenAIEmbeddingsClient()
      const response = await openai.embeddings.create({
        model: embeddingsDeployment,
        input: userInput,
        dimensions: 1536
      })

      const openaiEmbedding = response.data.map(item => item.embedding)[0]

      const { data: openaiFileItems, error: openaiError } =
        await supabaseAdmin.rpc("match_file_items_openai", {
          query_embedding: openaiEmbedding as any,
          match_count: sourceCount,
          file_ids: uniqueFileIds
        })

      if (openaiError) {
        throw openaiError
      }

      chunks = openaiFileItems
    } else if (embeddingsProvider === "local") {
      const localEmbedding = await generateLocalEmbedding(userInput)

      const { data: localFileItems, error: localFileItemsError } =
        await supabaseAdmin.rpc("match_file_items_local", {
          query_embedding: localEmbedding as any,
          match_count: sourceCount,
          file_ids: uniqueFileIds
        })

      if (localFileItemsError) {
        throw localFileItemsError
      }

      chunks = localFileItems
    }

    const mostSimilarChunks = chunks?.slice(0, sourceCount)

    return mostSimilarChunks
  } catch (error: any) {
    console.error("Error in retrieveRelevantContent:", error)
    throw error
  }
}

export async function retrieveFileContent(fileIds: string[]) {
  const uniqueFileIds = [...new Set(fileIds)]
  if (uniqueFileIds.length === 0) return []

  console.log("file ids: " + fileIds)

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Direct query to check if file_ids exist in the table
    const { data: existingFileIds, error: checkError } = await supabaseAdmin
      .from("file_items")
      .select("file_id")
      .in("file_id", uniqueFileIds)

    if (checkError) {
      console.error("Error checking file ids:", checkError)
      throw checkError
    }

    console.log("existing file ids: " + JSON.stringify(existingFileIds)) // Add this log

    const { data: fileItems, error } = await supabaseAdmin
      .from("file_items")
      .select("*")
      .in("file_id", uniqueFileIds)

    if (error) {
      console.error("Error in retrieveFileContent:", error)
      throw error
    }

    console.log("Supabase query executed successfully") // Add this log
    // console.log("file items: " + JSON.stringify(fileItems)) // Add this log

    // Check if fileItems is empty
    if (!fileItems || fileItems.length === 0) {
      console.warn("No file items found for the given file ids") // Add this log
    }

    // Group file items by file_id
    const groupedFileItems = fileItems.reduce(
      (acc, item) => {
        if (!acc[item.file_id]) {
          acc[item.file_id] = []
        }
        acc[item.file_id].push(item)
        return acc
      },
      {} as Record<string, typeof fileItems>
    )

    // Combine content for each file
    const fileContents = Object.entries(groupedFileItems).map(
      ([fileId, items]) => ({
        fileId,
        content: items.map(item => item.content).join("\n")
      })
    )

    // console.log("file contents: " + JSON.stringify(fileContents)) // Add this log

    return fileContents
  } catch (error: any) {
    console.error("Error in retrieveFileContent:", error)
    throw error
  }
}
