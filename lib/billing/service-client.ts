import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/types"

/**
 * Service-role Supabase client for billing writes (usage metering + the
 * RevenueCat webhook). Bypasses RLS, so it must only ever be used server-side.
 * Mirrors the pattern in lib/rag/server.ts. Works in both the Node and Edge
 * runtimes (the SDK is fetch-based; service-role env is injected into edge fns).
 */
let _admin: SupabaseClient<Database> | null = null

export function getBillingAdminClient(): SupabaseClient<Database> {
  if (_admin) return _admin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Billing requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  _admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return _admin
}
