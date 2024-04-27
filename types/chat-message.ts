import { Tables } from "@/supabase/types"

export interface ChatMessage {
  message: Tables<"messages">
  fileItems: Tables<"file_items">[]
  feedback?: Tables<"feedback">
}
