import { NextResponse } from "next/server"
import { execSync } from "child_process"

const GMAIL_USER = "steeleagentic@gmail.com"
const GMAIL_APP_PASS = "hykthkubqorybvnb"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const {
      companyName,
      website,
      location,
      teamSize,
      annualRevenue,
      currentChallenges,
      aiExperience,
      goals,
      preferredTime,
      sessionId
    } = data

    // Send intake notification to Steele
    const emailSent = await sendIntakeEmail({
      companyName,
      website,
      location,
      teamSize,
      annualRevenue,
      currentChallenges,
      aiExperience,
      goals,
      preferredTime,
      sessionId
    })

    if (emailSent) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: "Failed to send intake notification" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Intake submission error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function sendIntakeEmail(data: any): Promise<boolean> {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1A1A1A; border-bottom: 3px solid #24BDEB; padding-bottom: 10px; }
    .section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .label { font-weight: bold; color: #666; display: block; margin-top: 15px; }
    .value { color: #333; margin-top: 5px; }
    .highlight { background: #24BDEB; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>🎯 New AI Consulting Client - Intake Submitted</h1>
  
  <div class="highlight">
    <strong>$5,000 Payment Received</strong><br>
    Session ID: ${data.sessionId || "N/A"}
  </div>

  <div class="section">
    <h2>Company Information</h2>
    <span class="label">Company Name:</span>
    <div class="value">${data.companyName}</div>
    
    <span class="label">Website:</span>
    <div class="value">${data.website || "Not provided"}</div>
    
    <span class="label">Location:</span>
    <div class="value">${data.location}</div>
    
    <span class="label">Team Size:</span>
    <div class="value">${data.teamSize}</div>
    
    <span class="label">Annual Revenue:</span>
    <div class="value">${data.annualRevenue}</div>
  </div>

  <div class="section">
    <h2>Challenges & Goals</h2>
    <span class="label">Current Challenges:</span>
    <div class="value">${data.currentChallenges}</div>
    
    <span class="label">90-Day Goals:</span>
    <div class="value">${data.goals}</div>
  </div>

  <div class="section">
    <h2>AI Experience & Scheduling</h2>
    <span class="label">AI Experience Level:</span>
    <div class="value">${data.aiExperience}</div>
    
    <span class="label">Preferred Session Time:</span>
    <div class="value">${data.preferredTime}</div>
  </div>

  <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 0 8px 8px 0;">
    <strong>Next Steps:</strong>
    <ol style="margin-top: 10px;">
      <li>Send scheduling link within 24 hours</li>
      <li>Prepare Week 1: AI Audit & Strategy materials</li>
      <li>Add to consulting client tracking spreadsheet</li>
      <li>Send welcome email with program overview</li>
    </ol>
  </div>

  <p style="margin-top: 30px; color: #999; font-size: 12px;">
    This intake was submitted automatically from the consulting success page.
  </p>
</body>
</html>`

  const plainContent = `NEW AI CONSULTING CLIENT - INTAKE SUBMITTED

Payment: $5,000 received
Session ID: ${data.sessionId || "N/A"}

COMPANY INFORMATION
Company Name: ${data.companyName}
Website: ${data.website || "Not provided"}
Location: ${data.location}
Team Size: ${data.teamSize}
Annual Revenue: ${data.annualRevenue}

CHALLENGES & GOALS
Current Challenges: ${data.currentChallenges}
90-Day Goals: ${data.goals}

AI EXPERIENCE
Experience Level: ${data.aiExperience}
Preferred Time: ${data.preferredTime}

NEXT STEPS:
1. Send scheduling link within 24 hours
2. Prepare Week 1 materials
3. Add to client tracking
4. Send welcome email

---
Submitted: ${new Date().toISOString()}`

  try {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    const emailContent = [
      `From: Rooftops AI Consulting <${GMAIL_USER}>`,
      `To: bsbillings@gmail.com`,
      `Cc: ${GMAIL_USER}`,
      `Subject: 🎯 New $5K Consulting Client - ${data.companyName}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      plainContent,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`
    ].join("\n")

    const curlCommand = `echo '${emailContent.replace(/'/g, "'\"'\"'")}' | curl -s --url "smtps://smtp.gmail.com:465" \
      --ssl-reqd \
      --mail-from "${GMAIL_USER}" \
      --mail-rcpt "bsbillings@gmail.com" \
      --mail-rcpt "${GMAIL_USER}" \
      --user "${GMAIL_USER}:${GMAIL_APP_PASS}" \
      --upload-file -`

    execSync(curlCommand, { stdio: "pipe" })

    console.log(`✅ Intake notification sent for ${data.companyName}`)
    return true
  } catch (error) {
    console.error("Failed to send intake email:", error)
    return false
  }
}
