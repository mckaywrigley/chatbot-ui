import { NextResponse } from "next/server"
import { Resend } from "resend"

// Resend client will be initialized lazily
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

interface EstimateItem {
  id?: string
  name: string
  qty: number
  unit: string
  price: number
}

interface ProposalEmailData {
  customerName: string
  customerEmail?: string
  customerPhone?: string
  propertyAddress: string
  roofSize: number
  estimateItems: EstimateItem[]
  estimateTotal: number
  validDays: number
  includeWarranty: boolean
  customerNotes?: string
  companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
    license?: string
  }
}

interface PropertyReportEmailData {
  address: string
  roofArea: number
  roofingSquares: number
  facetCount: number
  pitch?: string
  complexity?: string
  solarPanels?: number
  yearlyEnergy?: number
  netSavings?: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function generateProposalEmailHTML(data: ProposalEmailData): string {
  const companyName = data.companyInfo?.name || "Rooftops AI"
  const validUntil = new Date(
    Date.now() + data.validDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString()

  const itemsHTML = data.estimateItems
    .map(
      item => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB;">${item.name}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: right;">${item.qty} ${item.unit}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">${formatCurrency(item.qty * item.price)}</td>
      </tr>
    `
    )
    .join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Roofing Proposal from ${companyName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); padding: 32px; text-align: left;">
          <h1 style="color: #FFFFFF; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">${companyName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Licensed & Insured${data.companyInfo?.license ? ` • ${data.companyInfo.license}` : ""}</p>
        </div>

        <!-- Proposal Badge -->
        <div style="background-color: #F0FDFA; padding: 20px 32px; border-bottom: 1px solid #E5E7EB;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: 600;">Proposal for</p>
              <h2 style="margin: 0; font-size: 18px; color: #111827;">${data.customerName}</h2>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #4B5563;">${data.propertyAddress}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">Valid Until</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #0D9488;">${validUntil}</p>
            </div>
          </div>
        </div>

        <!-- Project Summary -->
        <div style="padding: 24px 32px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #374151; font-weight: 600;">Project Summary</h3>
          <p style="margin: 0; font-size: 14px; color: #4B5563;">
            <strong>Property:</strong> ${data.propertyAddress}<br>
            <strong>Roof Size:</strong> ${data.roofSize} squares
          </p>
        </div>

        <!-- Line Items -->
        <div style="padding: 0 32px 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #F9FAFB;">
                <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: 600;">Description</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: 600;">Qty</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: 600;">Rate</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 12px; color: #6B7280; text-transform: uppercase; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 16px 8px; text-align: right; font-size: 16px; font-weight: 700; color: #111827;">Total</td>
                <td style="padding: 16px 8px; text-align: right; font-size: 18px; font-weight: 700; color: #0D9488;">${formatCurrency(data.estimateTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${
          data.includeWarranty
            ? `
        <!-- Warranty Section -->
        <div style="margin: 0 32px 24px; padding: 16px; background-color: #F0FDFA; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #0D9488; font-weight: 600;">✓ Warranty Information</h4>
          <p style="margin: 0; font-size: 13px; color: #4B5563;">
            Workmanship warranty: 10 years<br>
            Manufacturer warranty: 30 years on shingles
          </p>
        </div>
        `
            : ""
        }

        ${
          data.customerNotes
            ? `
        <!-- Notes Section -->
        <div style="padding: 0 32px 24px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: 600;">Notes</h4>
          <p style="margin: 0; font-size: 13px; color: #4B5563; line-height: 1.5;">${data.customerNotes}</p>
        </div>
        `
            : ""
        }

        <!-- CTA Button -->
        <div style="padding: 24px 32px; text-align: center;">
          <a href="#" style="display: inline-block; background-color: #0D9488; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">Accept Proposal</a>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: #6B7280;">Questions? Reply to this email or call us directly.</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F3F4F6; padding: 24px 32px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280;">This proposal was generated by Rooftops AI</p>
          <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
            ${companyName}${data.companyInfo?.phone ? ` • ${data.companyInfo.phone}` : ""}${data.companyInfo?.email ? ` • ${data.companyInfo.email}` : ""}
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generatePropertyReportEmailHTML(
  data: PropertyReportEmailData
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Property Report from Rooftops AI</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); padding: 32px;">
          <h1 style="color: #FFFFFF; margin: 0 0 8px 0; font-size: 22px; font-weight: 700;">PROPERTY REPORT</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">${data.address}</p>
          <p style="color: rgba(255,255,255,0.75); margin: 8px 0 0 0; font-size: 12px;">Generated by Rooftops AI on ${new Date().toLocaleDateString()}</p>
        </div>

        <!-- Property Overview -->
        <div style="padding: 24px 32px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #0D9488; font-weight: 600;">PROPERTY OVERVIEW</h3>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Roof Area</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">${data.roofArea.toLocaleString()}</p>
              <p style="margin: 0; font-size: 12px; color: #6B7280;">sq ft</p>
            </div>
            <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Squares</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">${data.roofingSquares}</p>
              <p style="margin: 0; font-size: 12px; color: #6B7280;">squares</p>
            </div>
            <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6B7280; text-transform: uppercase;">Facets</p>
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827;">${data.facetCount}</p>
              <p style="margin: 0; font-size: 12px; color: #6B7280;">facets</p>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div style="padding: 0 32px 24px;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #6B7280;">Roof Pitch:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.pitch || "Standard"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280;">Complexity:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.complexity || "Moderate"}</td>
            </tr>
          </table>
        </div>

        ${
          data.solarPanels && data.solarPanels > 0
            ? `
        <!-- Solar Potential -->
        <div style="margin: 0 32px 24px; padding: 20px; background-color: #F0FDFA; border-radius: 8px;">
          <h4 style="margin: 0 0 16px 0; font-size: 14px; color: #0D9488; font-weight: 600;">☀️ Solar Potential</h4>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #4B5563;">Max Solar Panels:</td>
              <td style="padding: 4px 0; font-weight: 600; color: #0D9488;">${data.solarPanels}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4B5563;">Yearly Energy:</td>
              <td style="padding: 4px 0; font-weight: 600; color: #0D9488;">${(data.yearlyEnergy || 0).toLocaleString()} kWh</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4B5563;">20-Year Savings:</td>
              <td style="padding: 4px 0; font-weight: 600; color: #0D9488;">${formatCurrency(data.netSavings || 0)}</td>
            </tr>
          </table>
        </div>
        `
            : ""
        }

        <!-- CTA -->
        <div style="padding: 24px 32px; text-align: center;">
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #4B5563;">View the full interactive report with satellite imagery and AI analysis.</p>
          <a href="#" style="display: inline-block; background-color: #0D9488; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">View Full Report</a>
        </div>

        <!-- Footer -->
        <div style="background-color: #F3F4F6; padding: 24px 32px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280;">This report was generated by Rooftops AI</p>
          <p style="margin: 0; font-size: 11px; color: #9CA3AF;">AI-powered property analysis for roofing professionals</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function POST(request: Request) {
  try {
    console.log("[Email Send] Starting email send process...")
    console.log(
      "[Email Send] RESEND_API_KEY exists:",
      !!process.env.RESEND_API_KEY
    )
    console.log(
      "[Email Send] RESEND_FROM_EMAIL:",
      process.env.RESEND_FROM_EMAIL
    )

    const resend = getResendClient()

    if (!resend) {
      console.error(
        "[Email Send] Resend client not initialized - missing API key"
      )
      return NextResponse.json(
        {
          error:
            "Email service not configured. Please add RESEND_API_KEY to environment."
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { type, recipientEmail, recipientName, data } = body

    console.log("[Email Send] Request:", {
      type,
      recipientEmail,
      recipientName
    })

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      )
    }

    let html: string
    let subject: string

    if (type === "proposal") {
      const proposalData = data as ProposalEmailData
      html = generateProposalEmailHTML(proposalData)
      subject = `Roofing Proposal for ${proposalData.propertyAddress} - ${proposalData.companyInfo?.name || "Rooftops AI"}`
    } else if (type === "property-report") {
      const reportData = data as PropertyReportEmailData
      html = generatePropertyReportEmailHTML(reportData)
      subject = `Property Report: ${reportData.address} - Rooftops AI`
    } else {
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "Rooftops AI <onboarding@resend.dev>"
    console.log(
      "[Email Send] Sending email from:",
      fromEmail,
      "to:",
      recipientEmail
    )

    // Send email using Resend
    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
      replyTo: data.companyInfo?.email || undefined
    })

    if (error) {
      console.error(
        "[Email Send] Resend API Error:",
        JSON.stringify(error, null, 2)
      )
      return NextResponse.json(
        { error: `Failed to send email: ${error.message}`, details: error },
        { status: 500 }
      )
    }

    console.log("[Email Send] Success! Message ID:", emailData?.id)
    return NextResponse.json({
      success: true,
      messageId: emailData?.id,
      message: `Email sent successfully to ${recipientEmail}`
    })
  } catch (error: any) {
    console.error("[Email Send] Unexpected Error:", error?.message || error)
    console.error("[Email Send] Stack:", error?.stack)
    return NextResponse.json(
      { error: `Failed to send email: ${error?.message || "Unknown error"}` },
      { status: 500 }
    )
  }
}
