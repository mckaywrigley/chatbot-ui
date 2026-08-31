/**
 * Row shapes for the affiliate tables. Hand-typed (rather than from the
 * generated Database types) so the service layer is strongly typed without a
 * types regen - mirrors the processed_webhook_events approach in the webhook.
 */

export type AffiliateStatus = "active" | "disabled"
export type ReferralStatus = "signed_up" | "converted" | "reversed"
export type PayoutStatus = "pending" | "paid"
export type ApplicationStatus = "pending" | "approved" | "rejected"

export interface ApplicationRow {
  user_id: string
  handle: string
  platform: string | null
  audience: string | null
  pitch: string | null
  status: ApplicationStatus
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface AffiliateRow {
  user_id: string
  code: string
  display_name: string | null
  commission_rate: number
  viewer_bonus_tokens: number
  status: AffiliateStatus
  created_at: string
  updated_at: string
}

export interface ReferralRow {
  id: string
  affiliate_user_id: string
  code: string
  referred_user_id: string
  status: ReferralStatus
  plan: string | null
  commission_cents: number
  bonus_granted: boolean
  payout_status: PayoutStatus
  converted_at: string | null
  created_at: string
  updated_at: string
}

/** Aggregated view returned to the influencer's dashboard (no raw user ids). */
export interface AffiliateDashboard {
  isAffiliate: true
  code: string
  displayName: string | null
  status: AffiliateStatus
  commissionRate: number
  viewerBonusCredits: number
  shareUrl: string
  stats: {
    signups: number
    conversions: number
    /** Commission booked across all conversions, in USD. */
    commissionTotalUsd: number
    /** Commission not yet marked paid, in USD. */
    commissionPendingUsd: number
  }
}

/** Application state shown to a non-affiliate (drives the apply/pending card). */
export interface AffiliateNotYet {
  isAffiliate: false
  application: {
    status: ApplicationStatus
    reviewNote: string | null
  } | null
}

/** The /api/affiliate/me payload: the dashboard, or the application state. */
export type AffiliateMe = AffiliateDashboard | AffiliateNotYet
