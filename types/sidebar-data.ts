import { Tables } from "@/supabase/types"

// Data collection items are stored in Firestore, not Supabase.
// They share the same shape as designs/reports for sidebar compatibility.
export interface DataCollectionItem {
  id: string
  name: string
  description: string
  user_id: string
  workspace_id: string
  folder_id: string | null
  sharing: string
  created_at: string
  updated_at: string
}

export type DataListType =
  | Tables<"collections">[]
  | Tables<"chats">[]
  | Tables<"presets">[]
  | Tables<"prompts">[]
  | Tables<"files">[]
  | Tables<"assistants">[]
  | Tables<"tools">[]
  | Tables<"models">[]
  | DataCollectionItem[]

export type DataItemType =
  | Tables<"collections">
  | Tables<"chats">
  | Tables<"presets">
  | Tables<"prompts">
  | Tables<"files">
  | Tables<"assistants">
  | Tables<"tools">
  | Tables<"models">
  | Tables<"reports">
  | Tables<"designs">
  | DataCollectionItem
