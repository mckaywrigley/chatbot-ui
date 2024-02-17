"use server"

import { TablesInsert, TablesUpdate } from "@/supabase/types"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export const getProfile = async (userId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const getProfiles = async (userId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const createProfile = async (profile: TablesInsert<"profiles">) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("profiles")
    .insert([profile])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}

export const updateProfile = async (
  profileId: string,
  profile: TablesUpdate<"profiles">
) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("profiles")
    .update(profile)
    .eq("id", profileId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}

export const deleteProfile = async (profileId: string) => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/")
  return data
}
