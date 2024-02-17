"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export const getChats = async (workspaceId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
