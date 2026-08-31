import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert } from "@/supabase/types"

/**
 * Loads the legacy `file_items` rows attached to a message.
 *
 * Previously this query lived on `messages.select("file_items(*)")`,
 * relying on PostgREST's auto-resolve through the `message_file_items`
 * M2M. That stopped resolving cleanly after migration 20260507 added a
 * second FK (`rag_item_id`) to the join table - PostgREST sees two
 * possible paths between `messages` and `file_items` and errors out
 * with "could not embed". The throw cascaded through `Promise.all`
 * in `ChatUI.fetchMessages`, so opening a saved chat appeared blank
 * and `setChatFiles` never ran (#24).
 *
 * We now query `message_file_items` directly, embed `file_items(*)`
 * via the single FK, and filter out rag-only rows. Returned shape is
 * kept identical to the old contract so callsites stay untouched.
 *
 * Tolerant of missing rows / RLS hiccups: returns an empty `file_items`
 * list rather than throwing, so one bad message can't blank the whole
 * chat window.
 */
export const getMessageFileItemsByMessageId = async (
  messageId: string
): Promise<{ id: string; file_items: any[] }> => {
  const { data, error } = await supabase
    .from("message_file_items")
    .select("file_items:file_items(*)")
    .eq("message_id", messageId)
    .not("file_item_id", "is", null)

  if (error) {
    console.warn(
      "[getMessageFileItemsByMessageId] embed failed for",
      messageId,
      error.message
    )
    return { id: messageId, file_items: [] }
  }

  // Each row is `{ file_items: { ... } }` (single embed via the
  // file_item_id FK). Flatten to the legacy contract.
  const file_items = (data ?? [])
    .map(row => (row as any).file_items)
    .filter(Boolean)
  return { id: messageId, file_items }
}

/**
 * Best-effort batch lookup: for a set of chats, return ONE representative RAG
 * source title per chat (the document an answer cited) so the chats list /
 * sidebar can show "from {source}". Single round-trip via the
 * message_file_items → messages embed (`message_id` FK). Chats with no RAG
 * citations are simply absent from the returned map.
 */
export const getChatSourceTitlesByChatIds = async (
  chatIds: string[]
): Promise<Record<string, string>> => {
  if (chatIds.length === 0) return {}
  const { data, error } = await supabase
    .from("message_file_items")
    .select("source_title, messages!inner(chat_id)")
    .not("source_title", "is", null)
    .in("messages.chat_id", chatIds)

  if (error) {
    console.warn(
      "[message-file-items] chat source titles fetch failed:",
      error.message
    )
    return {}
  }

  const out: Record<string, string> = {}
  for (const row of (data ?? []) as any[]) {
    const chatId = row.messages?.chat_id as string | undefined
    const title = row.source_title as string | undefined
    if (chatId && title && !out[chatId]) out[chatId] = title
  }
  return out
}

export const createMessageFileItems = async (
  messageFileItems: TablesInsert<"message_file_items">[]
) => {
  const { data: createdMessageFileItems, error } = await supabase
    .from("message_file_items")
    .insert(messageFileItems)
    .select("*")

  if (!createdMessageFileItems) {
    throw new Error(error.message)
  }

  return createdMessageFileItems
}

/**
 * Look up citation rows for a message that came from the RAG corpus
 * (rag_item_id set). Returns the denormalized snapshot fields written
 * at message-send time so chips survive page reload even if the source
 * doc was re-indexed since.
 */
export const getRagCitationsByMessageId = async (messageId: string) => {
  const { data, error } = await supabase
    .from("message_file_items")
    .select("id, rag_item_id, source_title, source_url, content_snapshot")
    .eq("message_id", messageId)
    .not("rag_item_id", "is", null)

  if (error) throw new Error(error.message)
  return data ?? []
}
