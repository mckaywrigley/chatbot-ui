"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export const getMessages = async (chatId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)

  if (error) {
    throw new Error(error.message)
  }

  return data
}
