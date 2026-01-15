import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"

// Check if Supabase environment variables are configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    : ({
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null })
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: null,
                error: { message: "Supabase not configured" }
              })
            })
          })
        })
      } as any)
