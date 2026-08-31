import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export const getMessageById = async (messageId: string) => {
  const { data: message } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single()

  if (!message) {
    throw new Error("Message not found")
  }

  return message
}

export const getMessagesByChatId = async (chatId: string) => {
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })

  if (!messages) {
    throw new Error("Messages not found")
  }

  return messages
}

/**
 * Returns a map of chatId → first user-message content for the given
 * set of chats. Used by the chat-history slab to show the *question*
 * the user asked as a subtitle under the chat title (#26). Best-effort
 * - chats without a stored first user message return an empty string;
 * the caller renders nothing for those.
 *
 * One round-trip for the whole list (vs N round-trips if we fetched
 * per chat). Sorted by sequence_number ascending and we keep the first
 * user-role row we see per chat.
 */
export const getFirstUserMessagePreviewsByChatIds = async (
  chatIds: string[]
): Promise<Record<string, string>> => {
  if (chatIds.length === 0) return {}
  const { data, error } = await supabase
    .from("messages")
    .select("chat_id, content, role, sequence_number")
    .in("chat_id", chatIds)
    .eq("role", "user")
    .order("sequence_number", { ascending: true })
  if (error) {
    console.warn("[messages] preview fetch failed:", error.message)
    return {}
  }
  const out: Record<string, string> = {}
  for (const row of data ?? []) {
    if (!out[row.chat_id as string])
      out[row.chat_id as string] = (row.content as string) ?? ""
  }
  return out
}

export const createMessage = async (message: TablesInsert<"messages">) => {
  const { data: createdMessage, error } = await supabase
    .from("messages")
    .insert([message])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdMessage
}

export const createMessages = async (messages: TablesInsert<"messages">[]) => {
  const { data: createdMessages, error } = await supabase
    .from("messages")
    .insert(messages)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  return createdMessages
}

export const updateMessage = async (
  messageId: string,
  message: TablesUpdate<"messages">
) => {
  const { data: updatedMessage, error } = await supabase
    .from("messages")
    .update(message)
    .eq("id", messageId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedMessage
}

export const deleteMessage = async (messageId: string) => {
  const { error } = await supabase.from("messages").delete().eq("id", messageId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export async function deleteMessagesIncludingAndAfter(
  userId: string,
  chatId: string,
  sequenceNumber: number
) {
  const { error } = await supabase.rpc("delete_messages_including_and_after", {
    p_user_id: userId,
    p_chat_id: chatId,
    p_sequence_number: sequenceNumber
  })

  if (error) {
    return {
      error: "Failed to delete messages."
    }
  }

  return true
}
