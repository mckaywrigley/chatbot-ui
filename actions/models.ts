"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export const getModels = async (workspaceId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("workspaces")
    .select(
      `
    id,
    name,
    models (*)
  `
    )
    .eq("id", workspaceId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data.models
}
