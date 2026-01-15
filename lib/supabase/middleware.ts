import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  // Check if Supabase environment variables are configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    // Return a mock supabase client that won't cause errors
    const mockSupabase = {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null })
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
    } as any

    return { supabase: mockSupabase, response }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options
          })
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          })
          response.cookies.set({
            name,
            value,
            ...options
          })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: "",
            ...options
          })
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          })
          response.cookies.set({
            name,
            value: "",
            ...options
          })
        }
      }
    }
  )

  return { supabase, response }
}
