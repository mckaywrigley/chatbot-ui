"use server"

import { TablesInsert, TablesUpdate } from "@/supabase/types"
import { ContentType } from "@/types"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export const createFolder = async (folder: TablesInsert<"folders">) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("folders")
    .insert([folder])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}

export const getFolders = async (workspaceId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const updateFolder = async (
  folderId: string,
  folder: TablesUpdate<"folders">
) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("folders")
    .update(folder)
    .eq("id", folderId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}

export const deleteFolderAndItems = async (
  folderId: string,
  contentType: ContentType
) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from(contentType)
    .delete()
    .eq("id", folderId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}

export const deleteFolder = async (folderId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}
