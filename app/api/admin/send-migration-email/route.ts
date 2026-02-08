import { NextResponse } from "next/server"
import { execSync } from "child_process"

const GMAIL_USER = "steeleagentic@gmail.com"
const GMAIL_APP_PASS = "hykthkubqorybvnb"

const TEMPLATES = {
  week1: {
    subject: "🚀 Your Rooftops AI Account Just Got a Major Upgrade",
    body: (firstName: string, email: string) => `Hi ${firstName},

Big news: We've completely rebuilt Rooftops AI from the ground up with features you've been asking for.

🔥 WHAT'S NEW:
✓ Multi-angle AI roof analysis (more accurate than ever)
✓ One-click professional proposals
✓ AI marketing assistant (writes your emails & posts)
✓ 10x faster report generation
✓ Mobile-optimized for job sites

🎁 YOUR EXCLUSIVE ACCESS:
As a current subscriber, you get 3 FREE months on the new platform. 
Your existing subscription stays active — this is a bonus.

👉 CLAIM YOUR UPGRADED ACCOUNT: https://rooftops.ai/login

Just sign in with your email (${email}) — no password reset needed.

Questions? Just reply to this email.

Steele Billings
Founder, Rooftops AI

P.S. — The new platform will eventually replace the old one, but you're getting early access with free months as our thank you for being an early supporter.`
  },

  week2: {
    subject: "Have you tried the new Rooftops AI yet? (3 free months waiting)",
    body: (firstName: string) => `Hi ${firstName},

Quick follow-up on your upgraded Rooftops AI account.

The new platform has been live for a week and early users are loving it:

💬 "The AI proposals alone save me 2 hours per job" — Mike R., Dallas
💬 "My close rate went from 30% to 55% with the professional reports" — Sarah C., Denver

Your free access is still waiting: https://rooftops.ai/login

If you have any concerns about switching, just reply and let me know.

— Steele`
  },

  week3: {
    subject: "[Last call] 72% of beta users switched to the new platform",
    body: (firstName: string) => `Hi ${firstName},

The numbers are in from our beta:

📊 72% of users who tried the new platform stayed
📊 Average time saved: 12 hours/week
📊 Average close rate increase: +35%

The new Rooftops AI is objectively better — but I need you to see it yourself.

Your 3 free months expire in 7 days: https://rooftops.ai/login

If the new platform doesn't blow you away, keep using the old one. No pressure.

— Steele`
  },

  week4: {
    subject: "Which Rooftops AI should we keep? (Quick survey)",
    body: (firstName: string) => `Hi ${firstName},

You've had exclusive access to both versions of Rooftops AI for 3 weeks now.

I need your help deciding the future direction:

👉 I'm switching to the NEW platform: https://rooftops.ai/login
👉 I'm staying on the CURRENT platform: Reply "keep legacy"
👉 I need help deciding: Reply and let's chat

Your feedback shapes what we build next.

Thanks,
Steele

P.S. — If I don't hear from you, I'll assume you're fine with either and will reach out personally to make sure you're taken care of.`
  }
}

export async function POST(request: Request) {
  try {
    const { email, firstName, template } = await request.json()

    if (!email || !template || !TEMPLATES[template as keyof typeof TEMPLATES]) {
      return NextResponse.json(
        {
          error:
            "Invalid request. Need email, firstName, and valid template (week1|week2|week3|week4)"
        },
        { status: 400 }
      )
    }

    const templateData = TEMPLATES[template as keyof typeof TEMPLATES]
    const subject = templateData.subject
    const plainBody = templateData.body(firstName, email)

    // Simple HTML version
    const htmlBody = plainBody
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>")
      .replace(/👉/g, '<span style="font-size: 18px;">👉</span>')
      .replace(/🔥/g, '<span style="font-size: 18px;">🔥</span>')
      .replace(/🎁/g, '<span style="font-size: 18px;">🎁</span>')
      .replace(/📊/g, '<span style="font-size: 18px;">📊</span>')
      .replace(/💬/g, '<span style="font-size: 18px;">💬</span>')
      .replace(/✓/g, "✓")

    const fullHtml = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${htmlBody}
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #999;">
    Rooftops AI | sb@rooftops.ai<br>
    <a href="https://rooftops.ai">rooftops.ai</a>
  </p>
</body>
</html>`

    // Send via Gmail
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    const emailContent = [
      `From: Steele Billings <${GMAIL_USER}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      plainBody,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      fullHtml,
      ``,
      `--${boundary}--`
    ].join("\n")

    const curlCommand = `echo '${emailContent.replace(/'/g, "'\"'\"'")}' | curl -s --url "smtps://smtp.gmail.com:465" \
      --ssl-reqd \
      --mail-from "${GMAIL_USER}" \
      --mail-rcpt "${email}" \
      --user "${GMAIL_USER}:${GMAIL_APP_PASS}" \
      --upload-file -`

    execSync(curlCommand, { stdio: "pipe" })

    return NextResponse.json({
      success: true,
      message: `Migration email (${template}) sent to ${email}`
    })
  } catch (error) {
    console.error("Failed to send migration email:", error)
    return NextResponse.json(
      { error: "Failed to send email", details: (error as Error).message },
      { status: 500 }
    )
  }
}
