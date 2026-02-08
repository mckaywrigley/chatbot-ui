import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/service-role"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Rooftops AI <onboarding@resend.dev>"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      )
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured")
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      )
    }

    if (RESEND_FROM_EMAIL?.includes("@resend.dev")) {
      console.warn(
        "⚠️  Using Resend sandbox domain (@resend.dev). Emails will ONLY deliver to your Resend account email."
      )
    }

    // Save lead capture to database
    try {
      await supabase.from("lead_captures").insert({
        email,
        source: "consulting_playbook"
      })
    } catch (dbError) {
      console.warn("Failed to save lead capture:", dbError)
    }

    const sent = await sendPlaybookEmail(email)

    if (sent) {
      return NextResponse.json({
        success: true,
        message: "Playbook email sent"
      })
    } else {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error sending playbook:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function sendPlaybookEmail(toEmail: string): Promise<boolean> {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Roofing AI Playbook</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1A1A1A;
            margin-bottom: 10px;
        }
        .tagline {
            color: #24BDEB;
            font-size: 14px;
        }
        h1 {
            color: #1A1A1A;
            font-size: 24px;
            margin: 30px 0 20px 0;
            text-align: center;
        }
        .playbook-box {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
        }
        .playbook-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
            color: #67e8f9;
        }
        .playbook-title {
            font-size: 22px;
            font-weight: bold;
            margin: 10px 0;
        }
        .playbook-subtitle {
            font-size: 14px;
            color: #94a3b8;
            margin-top: 5px;
        }
        .chapters {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
        }
        .chapters h3 {
            margin-top: 0;
            color: #1A1A1A;
        }
        .chapters ol {
            margin: 15px 0;
            padding-left: 20px;
        }
        .chapters li {
            margin: 10px 0;
            color: #555;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .consulting-box {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            border-left: 4px solid #24BDEB;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏠 Rooftops AI</div>
            <div class="tagline">AI Consulting for Roofing Companies</div>
        </div>

        <h1>Your Roofing AI Playbook Is Here</h1>

        <p>Thanks for downloading <strong>The Roofing AI Playbook</strong>. This 27-page guide breaks down exactly how AI is transforming roofing businesses — and how you can use it to win more jobs, save time, and grow faster.</p>

        <div class="playbook-box">
            <div class="playbook-label">Free Guide</div>
            <div class="playbook-title">The Roofing AI Playbook</div>
            <div class="playbook-subtitle">27 pages · 5 chapters · Actionable strategies</div>
        </div>

        <div class="chapters">
            <h3>What's Inside:</h3>
            <ol>
                <li><strong>The AI Advantage</strong> — Why roofers who adopt AI now will dominate in 2-3 years</li>
                <li><strong>Instant Roof Measurements</strong> — How satellite AI eliminates manual measuring</li>
                <li><strong>AI-Powered Estimating</strong> — Generate professional proposals in minutes, not hours</li>
                <li><strong>Automated Marketing</strong> — Let AI handle content, follow-ups, and lead nurturing</li>
                <li><strong>Implementation Roadmap</strong> — Your 90-day plan to becoming an AI-powered company</li>
            </ol>
        </div>

        <div style="text-align: center;">
            <a href="https://rooftops.ai/login" class="cta-button">Start Using Rooftops AI Free →</a>
        </div>

        <div class="consulting-box">
            <h3 style="margin-top: 0; color: #1A1A1A;">🎯 Want 1-on-1 Help Implementing AI?</h3>
            <p style="margin-bottom: 15px; color: #555;">
                Our 5-week consulting program takes roofing company leaders from zero to fully AI-enabled.
                Only 4 spots per month.
            </p>
            <a href="https://rooftops.ai/consulting" style="color: #06b6d4; font-weight: 600; text-decoration: none;">
                Learn About AI Consulting ($5,000) →
            </a>
        </div>

        <p style="text-align: center; color: #666; font-size: 14px;">
            Questions? Reply to this email or reach Steele directly at sb@rooftops.ai
        </p>

        <div class="footer">
            <p><strong>Rooftops AI</strong></p>
            <p>AI-powered tools and consulting for roofing contractors.</p>
            <p style="margin-top: 15px;">© 2025 Rooftops AI. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

  const plainContent = `The Roofing AI Playbook - Your Free Guide

Thanks for downloading The Roofing AI Playbook!

This 27-page guide breaks down exactly how AI is transforming roofing businesses and how you can use it to win more jobs, save time, and grow faster.

WHAT'S INSIDE:

1. The AI Advantage — Why roofers who adopt AI now will dominate in 2-3 years
2. Instant Roof Measurements — How satellite AI eliminates manual measuring
3. AI-Powered Estimating — Generate professional proposals in minutes, not hours
4. Automated Marketing — Let AI handle content, follow-ups, and lead nurturing
5. Implementation Roadmap — Your 90-day plan to becoming an AI-powered company

Start using Rooftops AI free: https://rooftops.ai/login

---

Want 1-on-1 help implementing AI?
Our 5-week consulting program takes roofing company leaders from zero to fully AI-enabled.
Learn more: https://rooftops.ai/consulting

Questions? Email sb@rooftops.ai

© 2025 Rooftops AI`

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: toEmail,
        subject: "📘 Your Roofing AI Playbook — 27 Pages of AI Strategy",
        html: htmlContent,
        text: plainContent
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(
        "Resend API error:",
        JSON.stringify(data),
        "Status:",
        response.status
      )
      return false
    }

    console.log(`Playbook email sent to ${toEmail}`, data.id)
    return true
  } catch (error) {
    console.error("Failed to send playbook email:", error)
    return false
  }
}
