"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export const getAssistants = async (workspaceId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("workspaces")
    .select(
      `
        id,
        name,
        assistants (*)
      `
    )
    .eq("id", workspaceId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data.assistants
}
