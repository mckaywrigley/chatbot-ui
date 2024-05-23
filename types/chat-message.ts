import { Tables } from "@/supabase/types"

export interface ChatMessage {
  message: Tables<"messages">
  fileItems: Tables<"file_items">[]
  feedback?: Tables<"feedback">
}

export interface BuiltChatMessage {
  role: string
  content:
    | string
    | (
        | {
            type: "image_url"
            image_url: {
              url: string
            }
          }
        | {
            type: "text"
            text: string
          }
      )[]
}
;[]
