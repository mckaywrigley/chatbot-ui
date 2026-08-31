/**
 * Minimal transactional-email helper.
 *
 * Uses Resend's HTTP API directly when RESEND_API_KEY is set so we don't need
 * to add a new npm dependency. When the key is not configured, this logs the
 * intended email and resolves - callers treat delivery as best-effort.
 */

interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  delivered: boolean
  provider: "resend" | "none"
  error?: string
}

// IMPORTANT: the sending domain here must be VERIFIED in the Resend account, or
// Resend rejects the send (422 "domain is not verified") and nothing arrives.
// Defaults to the app's own domain (shadowai.work); override with
// EMAIL_FROM_ADDRESS once a different verified domain/subdomain is set up.
const DEFAULT_FROM =
  process.env.EMAIL_FROM_ADDRESS || "Shadow AI <notifications@shadowai.work>"

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(
      "[EMAIL] RESEND_API_KEY not set - email not sent (logged only)",
      { to: input.to, subject: input.subject }
    )
    return { delivered: false, provider: "none" }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: input.from ?? DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo
      })
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("[EMAIL] Resend request failed", res.status, body)
      return {
        delivered: false,
        provider: "resend",
        error: `HTTP ${res.status}: ${body.slice(0, 200)}`
      }
    }

    return { delivered: true, provider: "resend" }
  } catch (err: any) {
    console.error("[EMAIL] Resend fetch error", err)
    return {
      delivered: false,
      provider: "resend",
      error: err?.message ?? String(err)
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export interface DesignInviteEmailInput {
  to: string
  inviterName: string
  inviterEmail: string | null
  designName: string
  role: "viewer" | "editor"
  designUrl: string | null
  signupUrl: string | null
  isPending: boolean
}

export async function sendDesignInviteEmail(
  input: DesignInviteEmailInput
): Promise<SendEmailResult> {
  const roleLabel = input.role === "editor" ? "edit" : "view"
  const subject = `${input.inviterName} shared a research design with you`

  const safeName = escapeHtml(input.designName)
  const safeInviter = escapeHtml(input.inviterName)
  const ctaUrl = input.isPending ? input.signupUrl : input.designUrl
  const ctaLabel = input.isPending ? "Sign up to view" : `Open design`

  const ctaButton = ctaUrl
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">${ctaLabel}</a></p>`
    : ""

  const pendingNote = input.isPending
    ? `<p style="color:#555;">Use the email <strong>${escapeHtml(input.to)}</strong> when you sign up - the design will appear in your workspace automatically.</p>`
    : ""

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;">
      <h2 style="margin:0 0 12px;">${safeInviter} shared a design with you</h2>
      <p style="margin:0 0 8px;">You have been granted <strong>${roleLabel}</strong> access to <strong>${safeName}</strong>.</p>
      ${ctaButton}
      ${pendingNote}
      <p style="color:#888;font-size:12px;margin-top:32px;">If you weren't expecting this, you can safely ignore this email.</p>
    </div>
  `.trim()

  const text = [
    `${input.inviterName} shared a design with you.`,
    `Design: ${input.designName}`,
    `Access: ${roleLabel}`,
    ctaUrl ? `Open: ${ctaUrl}` : "",
    input.isPending
      ? `Sign up with ${input.to} - the design will appear in your workspace automatically.`
      : ""
  ]
    .filter(Boolean)
    .join("\n")

  return sendEmail({
    to: input.to,
    subject,
    html,
    text,
    replyTo: input.inviterEmail ?? undefined
  })
}
