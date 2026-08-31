import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

/**
 * Loads the file attachments stored on a chat (StartChatModal's "Files"
 * tab persists these via `chat_files`).
 *
 * Was previously `chats.select("files(*)")` which relied on
 * PostgREST's M2M auto-resolve through `chat_files`. After the RAG
 * migration that path returned no rows (the embed silently flattened),
 * so opening a saved file-attached chat lost its file pills (#24).
 *
 * We now query `chat_files` directly with a single FK embed of
 * `files(*)`, then map back into the legacy `{id, name, files: [...]}`
 * shape so chat-ui.tsx callsites stay untouched. If the query errors
 * we degrade to an empty `files` list rather than throw - the parent
 * `fetchMessages` then keeps going and the chat still renders.
 */
export const getChatFilesByChatId = async (
  chatId: string
): Promise<{ id: string; name: string; files: any[] }> => {
  const { data: chatRow, error: chatErr } = await supabase
    .from("chats")
    .select("id, name")
    .eq("id", chatId)
    .maybeSingle()
  if (chatErr || !chatRow) {
    return { id: chatId, name: "", files: [] }
  }

  const { data, error } = await supabase
    .from("chat_files")
    .select("files:files(*)")
    .eq("chat_id", chatId)
  if (error) {
    console.warn("[getChatFilesByChatId] embed failed:", error.message)
    return { id: chatRow.id, name: chatRow.name, files: [] }
  }

  const files = (data ?? []).map(row => (row as any).files).filter(Boolean)
  return { id: chatRow.id, name: chatRow.name, files }
}

export const createChatFile = async (chatFile: TablesInsert<"chat_files">) => {
  const { data: createdChatFile, error } = await supabase
    .from("chat_files")
    .insert(chatFile)
    .select("*")

  if (!createdChatFile) {
    throw new Error(error.message)
  }

  return createdChatFile
}

export const createChatFiles = async (
  chatFiles: TablesInsert<"chat_files">[]
) => {
  const { data: createdChatFiles, error } = await supabase
    .from("chat_files")
    .insert(chatFiles)
    .select("*")

  if (!createdChatFiles) {
    throw new Error(error.message)
  }

  return createdChatFiles
}
