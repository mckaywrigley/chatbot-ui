import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"

// When NEXT_PUBLIC_SUPABASE_PROXY is "true", route browser requests through
// our own domain to bypass ISP-level DNS blocking of supabase.co (e.g. in India).
// Supabase-js requires an absolute URL (it internally calls `new URL(...)`),
// so on the browser we prefix the proxy path with window.location.origin.
// During SSR we fall back to the real Supabase URL - this module is only
// *evaluated* on the server, the client itself is used in the browser.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_PROXY === "true" &&
  typeof window !== "undefined"
    ? `${window.location.origin}/supabase-proxy`
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

// Supabase-js derives its default storage key from the URL hostname. With the
// proxy in use, the browser would derive `sb-app-auth-token` while the server
// writes `sb-<projectRef>-auth-token` - a mismatch that leaves the browser
// client unauthenticated. Pin the key to the project ref so both sides agree.
const projectRef = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL!
).hostname.split(".")[0]

export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {},
    auth: {
      storageKey: `sb-${projectRef}-auth-token`
    }
  }
)
