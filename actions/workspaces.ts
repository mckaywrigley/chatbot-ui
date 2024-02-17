"use server"

import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export const getHomeWorkspace = async (userId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("is_home", true)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getWorkspace = async (workspaceId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getWorkspaces = async (userId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return data
}
