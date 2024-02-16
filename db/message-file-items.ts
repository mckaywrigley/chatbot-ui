import { TablesInsert } from "@/supabase/types"
import { supabase } from "@/utils/supabase/browser-client"

export const getMessageFileItemsByMessageId = async (messageId: string) => {
  const { data: messageFileItems, error } = await supabase
    .from("messages")
    .select(
      `
      id,
      file_items (*)
    `
    )
    .eq("id", messageId)
    .single()

  if (!messageFileItems) {
    throw new Error(error.message)
  }

  return messageFileItems
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
