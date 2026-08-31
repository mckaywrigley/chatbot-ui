/**
 * @jest-environment node
 *
 * Pure logic for the influencer affiliate program: commission math, ledger
 * aggregation, and referral-code normalization. The DB-touching paths
 * (attribution / conversion RPC) are integration-level and covered out of band.
 */
import {
  aggregateReferrals,
  commissionCentsFor
} from "@/lib/affiliate/service"
import { submitApplication } from "@/lib/affiliate/applications"
import { isValidCode, normalizeCode, suggestCode } from "@/lib/affiliate/codes"
import type { ReferralRow } from "@/lib/affiliate/types"

const ref = (over: Partial<ReferralRow>): ReferralRow => ({
  id: "r",
  affiliate_user_id: "a",
  code: "CODE",
  referred_user_id: "u",
  status: "signed_up",
  plan: null,
  commission_cents: 0,
  bonus_granted: false,
  payout_status: "pending",
  converted_at: null,
  created_at: "",
  updated_at: "",
  ...over
})

describe("commissionCentsFor", () => {
  it("is a share of the plan list price", () => {
    expect(commissionCentsFor("pro", 0.2)).toBe(400) // $20 * 20%
    expect(commissionCentsFor("max", 0.3)).toBe(3000) // $100 * 30%
  })
  it("is 0 for the free plan", () => {
    expect(commissionCentsFor("free", 0.2)).toBe(0)
  })
  it("clamps the rate to [0,1] and tolerates junk", () => {
    expect(commissionCentsFor("pro", 5)).toBe(2000) // clamped to 100%
    expect(commissionCentsFor("pro", -1)).toBe(0)
    expect(commissionCentsFor("pro", NaN)).toBe(0)
  })
  it("treats an unknown plan as free", () => {
    expect(commissionCentsFor("enterprise", 0.5)).toBe(0)
  })
})

describe("aggregateReferrals", () => {
  it("counts signups, conversions, and splits earned vs owed", () => {
    const rows = [
      ref({ status: "signed_up" }),
      ref({ status: "converted", commission_cents: 400, payout_status: "pending" }),
      ref({ status: "converted", commission_cents: 3000, payout_status: "paid" }),
      ref({ status: "reversed", commission_cents: 999 })
    ]
    const s = aggregateReferrals(rows)
    expect(s.signups).toBe(4)
    expect(s.conversions).toBe(2)
    expect(s.commissionTotalUsd).toBeCloseTo(34.0) // 400 + 3000 cents
    expect(s.commissionPendingUsd).toBeCloseTo(4.0) // only the unpaid one
  })
  it("is all zeros for an empty ledger", () => {
    const s = aggregateReferrals([])
    expect(s).toEqual({
      signups: 0,
      conversions: 0,
      commissionTotalUsd: 0,
      commissionPendingUsd: 0
    })
  })
})

describe("referral codes", () => {
  it("normalizes to uppercase alphanumerics", () => {
    expect(normalizeCode("  ada love-7 ")).toBe("ADALOVE7")
    expect(normalizeCode("résumé!!")).toBe("RSUM")
    expect(normalizeCode(null)).toBe("")
  })
  it("validates length 3–32", () => {
    expect(isValidCode("AB")).toBe(false)
    expect(isValidCode("ABC")).toBe(true)
    expect(isValidCode("A".repeat(32))).toBe(true)
    expect(isValidCode("A".repeat(33))).toBe(false)
    expect(isValidCode("ab-c")).toBe(false) // not normalized
  })
  it("suggests a valid code seeded from the name", () => {
    const code = suggestCode("Ada Lovelace")
    expect(isValidCode(code)).toBe(true)
    expect(code.startsWith("ADALOVEL")).toBe(true)
  })
  it("suggests a valid code even from an empty seed", () => {
    expect(isValidCode(suggestCode(""))).toBe(true)
  })
})

describe("submitApplication validation", () => {
  // These short-circuit before any DB call, so they're safe without env.
  it("requires a signed-in user", async () => {
    const r = await submitApplication({ userId: "", handle: "Ada" })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/signed in/i)
  })
  it("requires a handle of at least 2 chars", async () => {
    const r = await submitApplication({ userId: "u1", handle: "a" })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/handle/i)
  })
})
