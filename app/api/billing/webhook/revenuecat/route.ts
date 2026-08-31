import { NextResponse } from "next/server"
import { getBillingAdminClient } from "@/lib/billing/service-client"
import {
  interpretRevenueCatEvent,
  verifyRevenueCatWebhookAuth
} from "@/lib/billing/revenuecat"
import { getPlan } from "@/lib/billing/plans"
import { recordReferralConversion } from "@/lib/affiliate/service"

/**
 * POST /api/billing/webhook/revenuecat
 *
 * RevenueCat → us. Verifies the shared-secret Authorization header, then syncs
 * the subscriber's entitlements into billing_accounts. Idempotent and
 * defensive: any unhandled event is acknowledged with `ignored: true` so
 * RevenueCat doesn't retry forever. Configure the URL + Authorization secret
 * (REVENUECAT_WEBHOOK_AUTH) in the RevenueCat dashboard - see BILLING.md.
 */
export async function POST(req: Request) {
  let admin: ReturnType<typeof getBillingAdminClient> | null = null
  let claimedEventId: string | null = null
  try {
    if (!verifyRevenueCatWebhookAuth(req.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as {
      event?: Record<string, unknown>
    } | null
    const event = body?.event
    if (!event) {
      return NextResponse.json({ error: "Missing event" }, { status: 400 })
    }

    const action = interpretRevenueCatEvent(event)
    if (action.kind === "ignore") {
      return NextResponse.json({ ok: true, ignored: true })
    }

    admin = getBillingAdminClient()
    const userId = action.appUserId

    // Idempotency: claim this RevenueCat event id exactly once. A duplicate
    // delivery / retry hits the unique constraint and is skipped here, so an
    // additive credit top-up can't double-apply. (Cast: the ledger table isn't
    // in the generated Database types yet - see the 20260611 migration.) If
    // processing later fails, the claim is released in catch so a real retry
    // can re-process.
    const eventId = typeof event.id === "string" ? event.id : null
    if (eventId) {
      const { error: claimErr } = await (admin as any)
        .from("processed_webhook_events")
        .insert({ event_id: eventId, provider: "revenuecat" })
      if (claimErr) {
        if ((claimErr as { code?: string }).code === "23505") {
          return NextResponse.json({ ok: true, duplicate: true })
        }
        throw claimErr
      }
      claimedEventId = eventId
    }

    // Ensure the account row exists before mutating it.
    await admin
      .from("billing_accounts")
      .upsert(
        { user_id: userId },
        { onConflict: "user_id", ignoreDuplicates: true }
      )

    switch (action.kind) {
      case "set_plan": {
        const update: Record<string, unknown> = {
          plan: action.plan,
          subscription_status: action.status,
          rc_app_user_id: userId,
          rc_entitlement: getPlan(action.plan).rcEntitlement
        }
        // A new/renewed period: align our billing window to RevenueCat's and
        // reset usage so the fresh allowance applies.
        if (action.periodEndMs) {
          update.period_start = new Date().toISOString()
          update.period_end = new Date(action.periodEndMs).toISOString()
          update.tokens_used_period = 0
        }
        const { error } = await admin
          .from("billing_accounts")
          .update(update)
          .eq("user_id", userId)
        if (error) throw error

        // Influencer affiliate: book commission + grant the referred viewer's
        // bonus credits on their first paid purchase. Idempotent (the RPC
        // no-ops on renewals / already-converted referrals) and best-effort, so
        // it never fails the webhook.
        if (action.plan !== "free") {
          await recordReferralConversion({
            referredUserId: userId,
            plan: action.plan
          })
        }
        break
      }
      case "downgrade": {
        const { error } = await admin
          .from("billing_accounts")
          .update({
            plan: "free",
            subscription_status: action.status,
            rc_entitlement: null
          })
          .eq("user_id", userId)
        if (error) throw error
        break
      }
      case "status_only": {
        const { error } = await admin
          .from("billing_accounts")
          .update({ subscription_status: action.status })
          .eq("user_id", userId)
        if (error) throw error
        break
      }
      case "add_credits": {
        const { error } = await admin.rpc("add_custom_credits", {
          p_user_id: userId,
          p_tokens: action.tokens
        })
        if (error) throw error
        break
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    // Release the idempotency claim so RevenueCat's retry can re-process this
    // event (we return 500 below, which triggers the retry).
    if (admin && claimedEventId) {
      try {
        await (admin as any)
          .from("processed_webhook_events")
          .delete()
          .eq("event_id", claimedEventId)
      } catch (releaseErr) {
        console.error(
          "[billing/webhook/revenuecat] failed to release event claim",
          releaseErr
        )
      }
    }
    console.error("[billing/webhook/revenuecat] failed", e)
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    )
  }
}
