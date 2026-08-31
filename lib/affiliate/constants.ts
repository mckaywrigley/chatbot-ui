/**
 * Influencer affiliate program - shared constants.
 *
 * Discounts are delivered to referred viewers as GRANTED BONUS CREDITS on their
 * first paid subscription (not a price cut), so this layer is self-contained
 * and doesn't depend on RevenueCat/Stripe promo codes. Influencer "explore"
 * access is a comp Max plan granted by an admin (see app/api/admin/*).
 */

/** Cookie that carries a referral code from the influencer's link to signup. */
export const REFERRAL_COOKIE = "shadow_ref"

/** How long an attribution click survives before the viewer must sign up. */
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

/** Default share of the subscription price paid to the influencer (20%). */
export const DEFAULT_COMMISSION_RATE = 0.2

/** Default bonus credits a referred viewer gets on first subscription. */
export const DEFAULT_VIEWER_BONUS_CREDITS = 5000
