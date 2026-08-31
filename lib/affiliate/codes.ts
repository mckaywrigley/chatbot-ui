/**
 * Referral-code helpers. Codes are short, human-shareable, and case-insensitive
 * (always stored + compared normalized to uppercase, alphanumerics only).
 */

/** Normalize for storage / comparison: uppercase, strip everything but A–Z0–9. */
export function normalizeCode(raw: string | null | undefined): string {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")
}

/** Whether a normalized code is well-formed (3–32 chars - matches the DB CHECK). */
export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{3,32}$/.test(code)
}

// Ambiguous glyphs (0/O, 1/I) removed so codes survive being read aloud / typed.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/**
 * Derive a default code from an influencer's name/handle plus a short random
 * suffix for uniqueness, e.g. "ADALOVELACE" → "ADA7K2". Falls back to a fully
 * random code when the seed has no usable characters.
 */
export function suggestCode(seed: string | null | undefined): string {
  const base = normalizeCode(seed).slice(0, 8) || "SHADOW"
  let suffix = ""
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return (base + suffix).slice(0, 32)
}
