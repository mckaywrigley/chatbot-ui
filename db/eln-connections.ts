import { supabase } from "@/lib/supabase/browser-client"
import { Tables, TablesInsert, TablesUpdate } from "@/supabase/types"
import { ELNConnection } from "@/types/eln"

// Simple encryption for demo purposes - in production, use proper encryption
const simpleEncrypt = (text: string): string => {
  return btoa(text) // Base64 encoding - NOT secure for production
}

const simpleDecrypt = (encrypted: string): string => {
  return atob(encrypted) // Base64 decoding
}

export const getELNConnections = async (
  userId: string
): Promise<ELNConnection[]> => {
  const { data, error } = await supabase
    .from("eln_connections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  // Decrypt access tokens before returning
  return (data as Tables<"eln_connections">[]).map(conn => ({
    id: conn.id,
    user_id: conn.user_id,
    provider: conn.provider,
    access_token: simpleDecrypt(conn.access_token_encrypted),
    tenant_url: conn.tenant_url || undefined,
    display_name: conn.display_name || undefined,
    connected_at: conn.connected_at,
    updated_at: conn.updated_at || conn.created_at
  }))
}

export const getELNConnection = async (
  userId: string,
  connectionId: string
): Promise<ELNConnection | null> => {
  const { data, error } = await supabase
    .from("eln_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("id", connectionId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null // Not found
    }
    throw error
  }

  const conn = data as Tables<"eln_connections">
  return {
    id: conn.id,
    user_id: conn.user_id,
    provider: conn.provider,
    access_token: simpleDecrypt(conn.access_token_encrypted),
    tenant_url: conn.tenant_url || undefined,
    display_name: conn.display_name || undefined,
    connected_at: conn.connected_at,
    updated_at: conn.updated_at || conn.created_at
  }
}

export const createELNConnection = async (
  connection: Omit<ELNConnection, "id" | "connected_at" | "updated_at">
): Promise<ELNConnection> => {
  const insertData: TablesInsert<"eln_connections"> = {
    user_id: connection.user_id,
    provider: connection.provider,
    access_token_encrypted: simpleEncrypt(connection.access_token),
    tenant_url: connection.tenant_url,
    display_name: connection.display_name
  }

  const { data, error } = await supabase
    .from("eln_connections")
    .insert([insertData])
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const conn = data as Tables<"eln_connections">
  return {
    id: conn.id,
    user_id: conn.user_id,
    provider: conn.provider,
    access_token: connection.access_token, // Return original unencrypted
    tenant_url: conn.tenant_url || undefined,
    display_name: conn.display_name || undefined,
    connected_at: conn.connected_at,
    updated_at: conn.updated_at || conn.created_at
  }
}

export const updateELNConnection = async (
  connectionId: string,
  userId: string,
  updates: Partial<
    Omit<ELNConnection, "id" | "user_id" | "connected_at" | "updated_at">
  >
): Promise<ELNConnection> => {
  const updateData: TablesUpdate<"eln_connections"> = {}

  if (updates.access_token) {
    updateData.access_token_encrypted = simpleEncrypt(updates.access_token)
  }
  if (updates.tenant_url !== undefined) {
    updateData.tenant_url = updates.tenant_url
  }
  if (updates.display_name !== undefined) {
    updateData.display_name = updates.display_name
  }

  const { data, error } = await supabase
    .from("eln_connections")
    .update(updateData)
    .eq("id", connectionId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const conn = data as Tables<"eln_connections">
  return {
    id: conn.id,
    user_id: conn.user_id,
    provider: conn.provider,
    access_token: simpleDecrypt(conn.access_token_encrypted),
    tenant_url: conn.tenant_url || undefined,
    display_name: conn.display_name || undefined,
    connected_at: conn.connected_at,
    updated_at: conn.updated_at || conn.created_at
  }
}

export const deleteELNConnection = async (
  connectionId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from("eln_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", userId)

  if (error) {
    throw error
  }
}

export const getELNConnectionsByProvider = async (
  userId: string,
  provider: string
): Promise<ELNConnection[]> => {
  const { data, error } = await supabase
    .from("eln_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data as Tables<"eln_connections">[]).map(conn => ({
    id: conn.id,
    user_id: conn.user_id,
    provider: conn.provider,
    access_token: simpleDecrypt(conn.access_token_encrypted),
    tenant_url: conn.tenant_url || undefined,
    display_name: conn.display_name || undefined,
    connected_at: conn.connected_at,
    updated_at: conn.updated_at || conn.created_at
  }))
}
