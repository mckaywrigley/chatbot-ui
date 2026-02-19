/**
 * Enrichr — utility API wrapper
 * Filters profanity from user-generated content.
 *
 * Setup: add ENRICHR_API_KEY to your .env.local
 * Get a free key at https://enrichrapi.dev (1,000 calls/month free)
 */

const BASE = process.env.ENRICHR_BASE_URL ?? 'https://enrichrapi.dev';

interface ProfanityResult {
  contains_profanity: boolean;
  censored: string;
  original: string;
}

/**
 * Check text for profanity and return a censored version.
 * Returns null if ENRICHR_API_KEY is not set (graceful degradation).
 *
 * @example
 * const result = await checkProfanity(username);
 * if (result?.contains_profanity) {
 *   return new Response(JSON.stringify({ message: 'Username contains inappropriate content.' }), { status: 422 });
 * }
 */
export async function checkProfanity(
  text: string
): Promise<ProfanityResult | null> {
  const key = process.env.ENRICHR_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${BASE}/v1/filter/profanity`, {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as ProfanityResult;
  } catch {
    return null;
  }
}
