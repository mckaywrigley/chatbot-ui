/**
 * Environment contract for the nightly suite.
 *
 * Every value is read through here so a missing secret fails immediately with
 * the name of the thing to set, rather than surfacing later as an
 * unauthenticated 401 or an empty selector that looks like a product bug.
 */

function required(name: string): string {
  const v = process.env[name]
  if (!v || !v.trim()) {
    throw new Error(
      `[e2e] Missing required environment variable ${name}. ` +
        `See e2e/README.md for the full list of CI secrets.`
    )
  }
  return v.trim()
}

function optional(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim()
}

export const env = {
  /** Deployment under test. Defaults to production in the config. */
  baseUrl: optional("E2E_BASE_URL", "https://app.shadowai.work"),

  /** Long-lived QA account used by the smoke + pipeline projects. */
  email: required("E2E_EMAIL"),
  password: required("E2E_PASSWORD"),

  /**
   * Domain for the throwaway account the signup test creates. Must be a domain
   * that accepts mail (or at least does not bounce) - Supabase may send a
   * confirmation to it.
   */
  signupDomain: optional("E2E_SIGNUP_DOMAIN", "shadowai.work"),

  supabaseUrl: optional(
    "E2E_SUPABASE_URL",
    optional("NEXT_PUBLIC_SUPABASE_URL")
  ),
  /** Needed to delete the throwaway signup user and to stage a data file. */
  serviceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY")
}

/** True when we can clean up after ourselves. */
export const canAdminister = () =>
  Boolean(env.supabaseUrl && env.serviceRoleKey)
