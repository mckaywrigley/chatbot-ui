/**
 * Maps Supabase auth error messages to friendlier B2C-facing copy.
 *
 * Supabase surfaces raw strings like "Invalid login credentials" or
 * "User already registered" - good enough for engineers, terrible for
 * a first-time user. This helper normalises them into actionable lines
 * with no jargon. Anything we don't recognise falls back to the raw
 * message so we never swallow useful detail.
 */
export function friendlyAuthError(message: string | null | undefined): string {
  if (!message) return "Something went wrong. Please try again."
  const m = message.toLowerCase()

  if (m.includes("invalid login")) {
    return "Email or password doesn't match. Please try again."
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email - check your inbox for a link from us."
  }
  if (m.includes("user already registered") || m.includes("already exists")) {
    return "An account with that email already exists. Try signing in instead."
  }
  if (m.includes("password should be at least")) {
    return "Password is too short. Use at least 8 characters."
  }
  if (m.includes("password") && m.includes("weak")) {
    return "Password is too weak. Mix letters, numbers, and a symbol."
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again."
  }
  if (m.includes("not allowed to sign up")) {
    return "Sign-ups are limited right now. Reach out and we'll add you."
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Can't reach our servers. Check your connection and try again."
  }
  if (m.includes("invalid email") || m.includes("email address is invalid")) {
    return "That email looks off. Double-check the spelling."
  }
  return message
}
