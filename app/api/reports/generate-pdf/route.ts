import { NextResponse } from "next/server"
import jsPDF from "jspdf"

// Professional PDF Report Generator for Rooftops AI
// Generates beautiful, branded PDFs for proposals and property reports

interface EstimateItem {
  id?: string
  name: string
  qty: number
  unit: string
  price: number
}

interface ProposalData {
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
  templateId?: string
  companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
    license?: string
    logo?: string
  }
}

interface PropertyReportData {
  address: string
  roofArea: number
  roofingSquares: number
  facetCount: number
  pitch?: string
  complexity?: string
  condition?: string
  solarPanels?: number
  yearlyEnergy?: number
  installationCost?: number
  netSavings?: number
  images?: string[]
  recommendations?: string[]
  generatedDate?: string
}

// Rooftops AI brand colors
const COLORS = {
  primary: [13, 148, 136] as [number, number, number], // Teal #0D9488
  primaryDark: [15, 118, 110] as [number, number, number], // #0F766E
  primaryLight: [20, 184, 166] as [number, number, number], // #14B8A6
  accent: [245, 158, 11] as [number, number, number], // Amber #F59E0B
  gray900: [17, 24, 39] as [number, number, number],
  gray800: [31, 41, 55] as [number, number, number],
  gray700: [55, 65, 81] as [number, number, number],
  gray600: [75, 85, 99] as [number, number, number],
  gray500: [107, 114, 128] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray300: [209, 213, 219] as [number, number, number],
  gray200: [229, 231, 235] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray50: [249, 250, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  successLight: [209, 250, 229] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  navy: [30, 58, 138] as [number, number, number],
  navyDark: [23, 37, 84] as [number, number, number]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

// Helper to add logo to PDF
async function addLogoToPDF(
  pdf: jsPDF,
  logoBase64: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): Promise<void> {
  try {
    // Add logo image
    pdf.addImage(logoBase64, "PNG", x, y, maxWidth, maxHeight)
  } catch (error) {
    console.error("Error adding logo to PDF:", error)
    // Silently fail - logo is optional
  }
}

// =============================================================================
// TEMPLATE 1: PROFESSIONAL STANDARD
// Clean, modern design perfect for residential customers
// =============================================================================
function generateProfessionalStandardPDF(data: ProposalData): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 0

  const companyName = data.companyInfo?.name || "Your Roofing Company"
  const license = data.companyInfo?.license || ""

  // Header with gradient-like effect
  pdf.setFillColor(...COLORS.primary)
  pdf.rect(0, 0, pageWidth, 60, "F")

  // Logo placeholder area (left side)
  if (data.companyInfo?.logo) {
    // White background for logo
    pdf.setFillColor(...COLORS.white)
    pdf.roundedRect(margin, 12, 36, 36, 3, 3, "F")
    try {
      pdf.addImage(data.companyInfo.logo, "PNG", margin + 3, 15, 30, 30)
    } catch (e) {
      // Logo failed, continue without it
    }
    // Company name next to logo
    pdf.setTextColor(...COLORS.white)
    pdf.setFontSize(22)
    pdf.setFont("helvetica", "bold")
    pdf.text(companyName, margin + 42, 28)

    if (license) {
      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.text(`License: ${license}`, margin + 42, 38)
    }
  } else {
    // Company name without logo
    pdf.setTextColor(...COLORS.white)
    pdf.setFontSize(26)
    pdf.setFont("helvetica", "bold")
    pdf.text(companyName, margin, 30)

    if (license) {
      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.text(`License: ${license}`, margin, 42)
    }
  }

  // Proposal info (right side)
  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "bold")
  pdf.text("ROOFING PROPOSAL", pageWidth - margin, 20, { align: "right" })

  pdf.setFontSize(10)
  pdf.setFont("helvetica", "normal")
  const proposalNum = `#${Date.now().toString().slice(-6)}`
  pdf.text(proposalNum, pageWidth - margin, 30, { align: "right" })

  const validUntil = new Date(
    Date.now() + data.validDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  })
  pdf.text(`Valid until ${validUntil}`, pageWidth - margin, 40, {
    align: "right"
  })

  y = 75

  // Two-column customer/project info
  const colWidth = (contentWidth - 10) / 2

  // Customer Info Box
  pdf.setFillColor(...COLORS.gray50)
  pdf.roundedRect(margin, y - 5, colWidth, 45, 3, 3, "F")

  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text("PREPARED FOR", margin + 8, y + 3)

  pdf.setTextColor(...COLORS.gray900)
  pdf.setFontSize(14)
  pdf.text(data.customerName, margin + 8, y + 14)

  pdf.setTextColor(...COLORS.gray600)
  pdf.setFontSize(10)
  pdf.setFont("helvetica", "normal")
  pdf.text(data.propertyAddress, margin + 8, y + 23)

  if (data.customerEmail) {
    pdf.text(data.customerEmail, margin + 8, y + 31)
  }
  if (data.customerPhone) {
    pdf.text(data.customerPhone, margin + 8, y + 39)
  }

  // Project Details Box
  const rightColX = margin + colWidth + 10
  pdf.setFillColor(...COLORS.gray50)
  pdf.roundedRect(rightColX, y - 5, colWidth, 45, 3, 3, "F")

  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text("PROJECT DETAILS", rightColX + 8, y + 3)

  pdf.setTextColor(...COLORS.gray700)
  pdf.setFontSize(10)
  pdf.setFont("helvetica", "normal")
  pdf.text(`Roof Size: ${data.roofSize} squares`, rightColX + 8, y + 14)
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, rightColX + 8, y + 23)
  pdf.text(`Estimate #${proposalNum}`, rightColX + 8, y + 32)

  y += 55

  // Section Header: Scope of Work
  pdf.setTextColor(...COLORS.gray900)
  pdf.setFontSize(14)
  pdf.setFont("helvetica", "bold")
  pdf.text("Scope of Work", margin, y)

  y += 8

  // Table Header
  pdf.setFillColor(...COLORS.gray100)
  pdf.rect(margin, y, contentWidth, 10, "F")

  pdf.setTextColor(...COLORS.gray600)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text("DESCRIPTION", margin + 5, y + 7)
  pdf.text("QTY", margin + contentWidth * 0.55, y + 7)
  pdf.text("RATE", margin + contentWidth * 0.7, y + 7)
  pdf.text("AMOUNT", margin + contentWidth * 0.85, y + 7)

  y += 14

  // Table Rows
  pdf.setFont("helvetica", "normal")
  let rowIndex = 0

  for (const item of data.estimateItems) {
    if (y > pageHeight - 70) {
      pdf.addPage()
      y = 30
    }

    // Alternate row background
    if (rowIndex % 2 === 1) {
      pdf.setFillColor(...COLORS.gray50)
      pdf.rect(margin, y - 5, contentWidth, 12, "F")
    }

    pdf.setTextColor(...COLORS.gray800)
    pdf.setFontSize(10)
    pdf.text(item.name, margin + 5, y + 2)

    pdf.setTextColor(...COLORS.gray600)
    pdf.text(`${item.qty} ${item.unit}`, margin + contentWidth * 0.55, y + 2)
    pdf.text(`$${item.price.toFixed(2)}`, margin + contentWidth * 0.7, y + 2)

    const itemTotal = item.qty * item.price
    pdf.setTextColor(...COLORS.gray900)
    pdf.setFont("helvetica", "bold")
    pdf.text(formatCurrency(itemTotal), margin + contentWidth * 0.85, y + 2)
    pdf.setFont("helvetica", "normal")

    y += 12
    rowIndex++
  }

  // Total Row
  y += 5
  pdf.setFillColor(...COLORS.primary)
  pdf.roundedRect(
    margin + contentWidth * 0.5,
    y - 3,
    contentWidth * 0.5,
    14,
    2,
    2,
    "F"
  )

  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "bold")
  pdf.text("TOTAL INVESTMENT", margin + contentWidth * 0.55, y + 6)
  pdf.setFontSize(14)
  pdf.text(
    formatCurrency(data.estimateTotal),
    margin + contentWidth * 0.85,
    y + 6
  )

  y += 25

  // Warranty Section
  if (data.includeWarranty && y < pageHeight - 60) {
    pdf.setFillColor(...COLORS.successLight)
    pdf.roundedRect(margin, y, contentWidth, 28, 3, 3, "F")

    pdf.setTextColor(...COLORS.success)
    pdf.setFontSize(11)
    pdf.setFont("helvetica", "bold")
    pdf.text("✓ WARRANTY COVERAGE", margin + 8, y + 10)

    pdf.setTextColor(...COLORS.gray700)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "normal")
    pdf.text(
      "• 10-Year Workmanship Warranty on all labor and installation",
      margin + 8,
      y + 18
    )
    pdf.text(
      "• 30-Year Manufacturer Warranty on roofing materials",
      margin + 8,
      y + 25
    )

    y += 35
  }

  // Notes Section
  if (data.customerNotes && y < pageHeight - 50) {
    pdf.setTextColor(...COLORS.gray700)
    pdf.setFontSize(11)
    pdf.setFont("helvetica", "bold")
    pdf.text("Additional Notes", margin, y)

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    y += 7

    const noteLines = pdf.splitTextToSize(data.customerNotes, contentWidth)
    for (const line of noteLines) {
      if (y > pageHeight - 35) break
      pdf.text(line, margin, y)
      y += 5
    }
  }

  // Footer
  pdf.setFillColor(...COLORS.gray100)
  pdf.rect(0, pageHeight - 25, pageWidth, 25, "F")

  pdf.setTextColor(...COLORS.gray500)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "normal")
  pdf.text(
    `This estimate is valid for ${data.validDays} days from the date above.`,
    margin,
    pageHeight - 15
  )
  pdf.text(
    "Thank you for choosing " + companyName,
    pageWidth - margin,
    pageHeight - 15,
    { align: "right" }
  )

  return pdf
}

// =============================================================================
// TEMPLATE 2: DETAILED BREAKDOWN
// Comprehensive with itemized costs, specifications, and detailed line items
// =============================================================================
function generateDetailedBreakdownPDF(data: ProposalData): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = 0

  const companyName = data.companyInfo?.name || "Your Roofing Company"
  const license = data.companyInfo?.license || ""

  // Navy blue header for professional look
  pdf.setFillColor(...COLORS.navy)
  pdf.rect(0, 0, pageWidth, 50, "F")

  // Accent stripe
  pdf.setFillColor(...COLORS.accent)
  pdf.rect(0, 50, pageWidth, 3, "F")

  // Logo and company name
  if (data.companyInfo?.logo) {
    pdf.setFillColor(...COLORS.white)
    pdf.roundedRect(margin, 8, 34, 34, 2, 2, "F")
    try {
      pdf.addImage(data.companyInfo.logo, "PNG", margin + 2, 10, 30, 30)
    } catch (e) {}
    pdf.setTextColor(...COLORS.white)
    pdf.setFontSize(20)
    pdf.setFont("helvetica", "bold")
    pdf.text(companyName, margin + 40, 25)
    if (license) {
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      pdf.text(`License: ${license} | Licensed & Insured`, margin + 40, 35)
    }
  } else {
    pdf.setTextColor(...COLORS.white)
    pdf.setFontSize(24)
    pdf.setFont("helvetica", "bold")
    pdf.text(companyName, margin, 28)
    if (license) {
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      pdf.text(`License: ${license} | Licensed & Insured`, margin, 40)
    }
  }

  // Document title
  pdf.setFontSize(14)
  pdf.setFont("helvetica", "bold")
  pdf.text("DETAILED ESTIMATE", pageWidth - margin, 22, { align: "right" })

  const proposalNum = `EST-${Date.now().toString().slice(-8)}`
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  pdf.text(proposalNum, pageWidth - margin, 32, { align: "right" })
  pdf.text(new Date().toLocaleDateString(), pageWidth - margin, 40, {
    align: "right"
  })

  y = 65

  // Customer and Project Info in bordered boxes
  const boxHeight = 50
  const boxWidth = (contentWidth - 5) / 2

  // Customer Box
  pdf.setDrawColor(...COLORS.gray300)
  pdf.setLineWidth(0.5)
  pdf.rect(margin, y, boxWidth, boxHeight)

  pdf.setFillColor(...COLORS.navy)
  pdf.rect(margin, y, boxWidth, 8, "F")
  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "bold")
  pdf.text("BILL TO", margin + 3, y + 5.5)

  pdf.setTextColor(...COLORS.gray900)
  pdf.setFontSize(11)
  pdf.text(data.customerName, margin + 3, y + 17)

  pdf.setTextColor(...COLORS.gray600)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  const addressLines = pdf.splitTextToSize(data.propertyAddress, boxWidth - 6)
  let infoY = y + 24
  for (const line of addressLines) {
    pdf.text(line, margin + 3, infoY)
    infoY += 5
  }
  if (data.customerPhone) {
    pdf.text(`Tel: ${data.customerPhone}`, margin + 3, infoY)
    infoY += 5
  }
  if (data.customerEmail) {
    pdf.text(data.customerEmail, margin + 3, infoY)
  }

  // Project Box
  const rightX = margin + boxWidth + 5
  pdf.setDrawColor(...COLORS.gray300)
  pdf.rect(rightX, y, boxWidth, boxHeight)

  pdf.setFillColor(...COLORS.navy)
  pdf.rect(rightX, y, boxWidth, 8, "F")
  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "bold")
  pdf.text("PROJECT SPECIFICATIONS", rightX + 3, y + 5.5)

  pdf.setTextColor(...COLORS.gray700)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")

  const specs = [
    ["Job Site:", data.propertyAddress.split(",")[0]],
    ["Roof Size:", `${data.roofSize} squares (${data.roofSize * 100} sq ft)`],
    [
      "Valid Until:",
      new Date(
        Date.now() + data.validDays * 24 * 60 * 60 * 1000
      ).toLocaleDateString()
    ],
    ["Payment Terms:", "50% deposit, balance on completion"]
  ]

  let specY = y + 17
  for (const [label, value] of specs) {
    pdf.setFont("helvetica", "bold")
    pdf.text(label, rightX + 3, specY)
    pdf.setFont("helvetica", "normal")
    pdf.text(value as string, rightX + 35, specY)
    specY += 7
  }

  y += boxHeight + 15

  // Detailed Line Items Table
  pdf.setTextColor(...COLORS.navy)
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "bold")
  pdf.text("ITEMIZED COST BREAKDOWN", margin, y)

  y += 8

  // Table header
  pdf.setFillColor(...COLORS.navy)
  pdf.rect(margin, y, contentWidth, 10, "F")

  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "bold")

  const colWidths = [
    contentWidth * 0.4,
    contentWidth * 0.15,
    contentWidth * 0.15,
    contentWidth * 0.15,
    contentWidth * 0.15
  ]
  const colX = [
    margin + 3,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
  ]

  pdf.text("DESCRIPTION", colX[0], y + 7)
  pdf.text("QUANTITY", colX[1], y + 7)
  pdf.text("UNIT", colX[2], y + 7)
  pdf.text("UNIT PRICE", colX[3], y + 7)
  pdf.text("TOTAL", colX[4], y + 7)

  y += 12

  // Line items with alternating backgrounds
  let subtotal = 0
  for (let i = 0; i < data.estimateItems.length; i++) {
    const item = data.estimateItems[i]

    if (y > pageHeight - 60) {
      pdf.addPage()
      y = 20
    }

    if (i % 2 === 0) {
      pdf.setFillColor(...COLORS.gray50)
      pdf.rect(margin, y - 4, contentWidth, 10, "F")
    }

    const itemTotal = item.qty * item.price
    subtotal += itemTotal

    pdf.setTextColor(...COLORS.gray800)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "normal")
    pdf.text(item.name, colX[0], y + 2)
    pdf.text(item.qty.toString(), colX[1], y + 2)
    pdf.text(item.unit, colX[2], y + 2)
    pdf.text(`$${item.price.toFixed(2)}`, colX[3], y + 2)
    pdf.setFont("helvetica", "bold")
    pdf.text(formatCurrency(itemTotal), colX[4], y + 2)

    // Bottom border
    pdf.setDrawColor(...COLORS.gray200)
    pdf.setLineWidth(0.3)
    pdf.line(margin, y + 5, margin + contentWidth, y + 5)

    y += 10
  }

  // Summary section
  y += 5
  const summaryX = margin + contentWidth * 0.6
  const summaryWidth = contentWidth * 0.4

  pdf.setDrawColor(...COLORS.gray300)
  pdf.rect(summaryX, y, summaryWidth, 35)

  // Subtotal
  pdf.setTextColor(...COLORS.gray700)
  pdf.setFontSize(10)
  pdf.setFont("helvetica", "normal")
  pdf.text("Subtotal:", summaryX + 5, y + 10)
  pdf.text(formatCurrency(subtotal), summaryX + summaryWidth - 5, y + 10, {
    align: "right"
  })

  // Tax line (0%)
  pdf.text("Tax (0%):", summaryX + 5, y + 18)
  pdf.text("$0", summaryX + summaryWidth - 5, y + 18, { align: "right" })

  // Total
  pdf.setFillColor(...COLORS.navy)
  pdf.rect(summaryX, y + 22, summaryWidth, 13, "F")
  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(11)
  pdf.setFont("helvetica", "bold")
  pdf.text("TOTAL DUE:", summaryX + 5, y + 31)
  pdf.setFontSize(13)
  pdf.text(
    formatCurrency(data.estimateTotal),
    summaryX + summaryWidth - 5,
    y + 31,
    { align: "right" }
  )

  y += 45

  // Terms and warranty
  if (y < pageHeight - 50) {
    pdf.setTextColor(...COLORS.navy)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "bold")
    pdf.text("TERMS & WARRANTY", margin, y)

    y += 6
    pdf.setTextColor(...COLORS.gray700)
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "normal")

    const terms = [
      "• This estimate is valid for " +
        data.validDays +
        " days from the date above",
      "• 50% deposit required to schedule work; balance due upon completion",
      "• All work performed by licensed and insured professionals",
      data.includeWarranty ? "• 10-year workmanship warranty included" : "",
      data.includeWarranty ? "• 30-year manufacturer warranty on materials" : ""
    ].filter(Boolean)

    for (const term of terms) {
      pdf.text(term, margin, y)
      y += 5
    }
  }

  // Notes
  if (data.customerNotes && y < pageHeight - 35) {
    y += 5
    pdf.setTextColor(...COLORS.navy)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "bold")
    pdf.text("NOTES", margin, y)

    y += 5
    pdf.setTextColor(...COLORS.gray600)
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "normal")
    const noteLines = pdf.splitTextToSize(data.customerNotes, contentWidth)
    for (const line of noteLines) {
      if (y > pageHeight - 25) break
      pdf.text(line, margin, y)
      y += 4
    }
  }

  // Footer
  pdf.setFillColor(...COLORS.gray100)
  pdf.rect(0, pageHeight - 18, pageWidth, 18, "F")
  pdf.setTextColor(...COLORS.gray500)
  pdf.setFontSize(7)
  pdf.text(
    `${companyName} | Thank you for your business`,
    margin,
    pageHeight - 8
  )
  pdf.text(
    "Questions? Contact us anytime",
    pageWidth - margin,
    pageHeight - 8,
    { align: "right" }
  )

  return pdf
}

// =============================================================================
// TEMPLATE 3: QUICK QUOTE
// Simple one-page summary for fast turnaround
// =============================================================================
function generateQuickQuotePDF(data: ProposalData): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 0

  const companyName = data.companyInfo?.name || "Your Roofing Company"

  // Simple clean header
  pdf.setFillColor(...COLORS.primary)
  pdf.rect(0, 0, pageWidth, 8, "F")

  y = 25

  // Logo and company info on left
  if (data.companyInfo?.logo) {
    try {
      pdf.addImage(data.companyInfo.logo, "PNG", margin, y - 8, 25, 25)
    } catch (e) {}
    pdf.setTextColor(...COLORS.gray900)
    pdf.setFontSize(20)
    pdf.setFont("helvetica", "bold")
    pdf.text(companyName, margin + 30, y)
    if (data.companyInfo?.license) {
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(...COLORS.gray500)
      pdf.text(`License: ${data.companyInfo.license}`, margin + 30, y + 7)
    }
  } else {
    pdf.setTextColor(...COLORS.gray900)
    pdf.setFontSize(22)
    pdf.setFont("helvetica", "bold")
    pdf.text(companyName, margin, y)
    if (data.companyInfo?.license) {
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      pdf.setTextColor(...COLORS.gray500)
      pdf.text(`License: ${data.companyInfo.license}`, margin, y + 7)
    }
  }

  // Quote badge on right
  pdf.setFillColor(...COLORS.primary)
  pdf.roundedRect(pageWidth - margin - 45, y - 12, 45, 22, 3, 3, "F")
  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(10)
  pdf.setFont("helvetica", "bold")
  pdf.text("QUICK QUOTE", pageWidth - margin - 40, y - 3)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "normal")
  pdf.text(new Date().toLocaleDateString(), pageWidth - margin - 35, y + 5)

  y = 55

  // Horizontal divider
  pdf.setDrawColor(...COLORS.gray200)
  pdf.setLineWidth(0.5)
  pdf.line(margin, y, pageWidth - margin, y)

  y += 15

  // Customer info - simple and clean
  pdf.setTextColor(...COLORS.gray500)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text("QUOTE FOR:", margin, y)

  pdf.setTextColor(...COLORS.gray900)
  pdf.setFontSize(14)
  pdf.text(data.customerName, margin, y + 8)

  pdf.setFontSize(10)
  pdf.setTextColor(...COLORS.gray600)
  pdf.setFont("helvetica", "normal")
  pdf.text(data.propertyAddress, margin, y + 16)

  // Roof size badge
  pdf.setFillColor(...COLORS.gray100)
  pdf.roundedRect(pageWidth - margin - 50, y - 3, 50, 20, 3, 3, "F")
  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(16)
  pdf.setFont("helvetica", "bold")
  pdf.text(`${data.roofSize}`, pageWidth - margin - 35, y + 8)
  pdf.setFontSize(8)
  pdf.setTextColor(...COLORS.gray500)
  pdf.setFont("helvetica", "normal")
  pdf.text("squares", pageWidth - margin - 35, y + 14)

  y += 35

  // Simple line items
  pdf.setFillColor(...COLORS.gray50)
  pdf.rect(margin, y, contentWidth, 10, "F")
  pdf.setTextColor(...COLORS.gray600)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text("ITEM", margin + 5, y + 7)
  pdf.text("AMOUNT", pageWidth - margin - 5, y + 7, { align: "right" })

  y += 14

  for (const item of data.estimateItems) {
    const itemTotal = item.qty * item.price

    pdf.setTextColor(...COLORS.gray800)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.text(`${item.name} (${item.qty} ${item.unit})`, margin + 5, y)
    pdf.text(formatCurrency(itemTotal), pageWidth - margin - 5, y, {
      align: "right"
    })

    pdf.setDrawColor(...COLORS.gray200)
    pdf.line(margin, y + 4, pageWidth - margin, y + 4)

    y += 12
  }

  // Big total
  y += 10
  pdf.setFillColor(...COLORS.primary)
  pdf.roundedRect(margin, y, contentWidth, 25, 4, 4, "F")

  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "normal")
  pdf.text("Total Estimate", margin + 10, y + 10)

  pdf.setFontSize(22)
  pdf.setFont("helvetica", "bold")
  pdf.text(
    formatCurrency(data.estimateTotal),
    pageWidth - margin - 10,
    y + 17,
    { align: "right" }
  )

  y += 40

  // Quick terms
  pdf.setTextColor(...COLORS.gray500)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")

  const validDate = new Date(
    Date.now() + data.validDays * 24 * 60 * 60 * 1000
  ).toLocaleDateString()
  pdf.text(`✓ Quote valid until ${validDate}`, margin, y)
  y += 6
  pdf.text("✓ Free on-site consultation available", margin, y)
  y += 6
  if (data.includeWarranty) {
    pdf.text("✓ Full warranty included", margin, y)
    y += 6
  }
  pdf.text("✓ Licensed and insured", margin, y)

  // Notes
  if (data.customerNotes) {
    y += 15
    pdf.setTextColor(...COLORS.gray700)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "italic")
    const noteLines = pdf.splitTextToSize(
      `Note: ${data.customerNotes}`,
      contentWidth
    )
    for (const line of noteLines.slice(0, 3)) {
      pdf.text(line, margin, y)
      y += 5
    }
  }

  // Footer
  pdf.setFillColor(...COLORS.primary)
  pdf.rect(0, pageHeight - 12, pageWidth, 12, "F")
  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  pdf.text(
    "Ready to get started? Contact us today!",
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  )

  return pdf
}

// =============================================================================
// TEMPLATE 4: INSURANCE READY
// Formatted for insurance claims with required documentation
// =============================================================================
function generateInsuranceReadyPDF(data: ProposalData): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = 0

  const companyName = data.companyInfo?.name || "Your Roofing Company"
  const license = data.companyInfo?.license || "License #_______"

  // Professional header with form-like appearance
  pdf.setFillColor(...COLORS.gray800)
  pdf.rect(0, 0, pageWidth, 40, "F")

  // Logo
  if (data.companyInfo?.logo) {
    pdf.setFillColor(...COLORS.white)
    pdf.rect(margin, 5, 30, 30, "F")
    try {
      pdf.addImage(data.companyInfo.logo, "PNG", margin + 2, 7, 26, 26)
    } catch (e) {}
  }

  const titleX = data.companyInfo?.logo ? margin + 35 : margin

  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(18)
  pdf.setFont("helvetica", "bold")
  pdf.text(companyName.toUpperCase(), titleX, 18)

  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  pdf.text(`${license} | Licensed, Bonded & Insured`, titleX, 27)

  // Document type stamp
  pdf.setFillColor(...COLORS.accent)
  pdf.rect(pageWidth - margin - 55, 8, 55, 24, "F")
  pdf.setTextColor(...COLORS.gray900)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "bold")
  pdf.text("CONTRACTOR ESTIMATE", pageWidth - margin - 50, 16)
  pdf.setFontSize(7)
  pdf.setFont("helvetica", "normal")
  pdf.text("FOR INSURANCE PURPOSES", pageWidth - margin - 50, 23)
  pdf.text(
    `DOC #${Date.now().toString().slice(-8)}`,
    pageWidth - margin - 50,
    29
  )

  y = 50

  // Document info bar
  pdf.setFillColor(...COLORS.gray100)
  pdf.rect(margin, y, contentWidth, 12, "F")
  pdf.setDrawColor(...COLORS.gray300)
  pdf.rect(margin, y, contentWidth, 12, "S")

  pdf.setTextColor(...COLORS.gray700)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "bold")
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin + 5, y + 8)
  pdf.text(`Valid: ${data.validDays} Days`, margin + 50, y + 8)
  pdf.text(
    `Property: ${data.propertyAddress.split(",")[0]}`,
    margin + 90,
    y + 8
  )

  y += 20

  // Property Owner Information (Form style)
  pdf.setTextColor(...COLORS.gray900)
  pdf.setFontSize(11)
  pdf.setFont("helvetica", "bold")
  pdf.text("PROPERTY OWNER INFORMATION", margin, y)

  y += 5
  pdf.setDrawColor(...COLORS.gray300)
  pdf.setLineWidth(0.3)

  // Form fields
  const fields = [
    ["Name:", data.customerName],
    ["Property Address:", data.propertyAddress],
    ["Phone:", data.customerPhone || "_______________________"],
    ["Email:", data.customerEmail || "_______________________"]
  ]

  for (const [label, value] of fields) {
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "bold")
    pdf.text(label, margin, y + 6)

    pdf.setFont("helvetica", "normal")
    const labelWidth = pdf.getTextWidth(label) + 3
    pdf.text(value as string, margin + labelWidth, y + 6)

    pdf.line(margin + labelWidth, y + 8, margin + contentWidth, y + 8)
    y += 10
  }

  y += 5

  // Roof Specifications
  pdf.setFontSize(11)
  pdf.setFont("helvetica", "bold")
  pdf.text("ROOF SPECIFICATIONS", margin, y)

  y += 5
  pdf.setFillColor(...COLORS.gray50)
  pdf.rect(margin, y, contentWidth, 20, "F")
  pdf.rect(margin, y, contentWidth, 20, "S")

  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")

  const specCol1X = margin + 5
  const specCol2X = margin + contentWidth / 3
  const specCol3X = margin + (contentWidth / 3) * 2

  pdf.setFont("helvetica", "bold")
  pdf.text("Total Roof Area:", specCol1X, y + 8)
  pdf.text("Roofing Squares:", specCol2X, y + 8)
  pdf.text("Date of Inspection:", specCol3X, y + 8)

  pdf.setFont("helvetica", "normal")
  pdf.text(`${data.roofSize * 100} sq ft`, specCol1X, y + 15)
  pdf.text(`${data.roofSize} squares`, specCol2X, y + 15)
  pdf.text(new Date().toLocaleDateString(), specCol3X, y + 15)

  y += 28

  // Itemized Repair/Replacement Costs
  pdf.setFontSize(11)
  pdf.setFont("helvetica", "bold")
  pdf.text("ITEMIZED REPAIR/REPLACEMENT COSTS", margin, y)

  y += 5

  // Table header
  pdf.setFillColor(...COLORS.gray200)
  pdf.rect(margin, y, contentWidth, 8, "F")
  pdf.setDrawColor(...COLORS.gray400)
  pdf.rect(margin, y, contentWidth, 8, "S")

  pdf.setTextColor(...COLORS.gray800)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "bold")
  pdf.text("LINE", margin + 3, y + 5.5)
  pdf.text("DESCRIPTION", margin + 15, y + 5.5)
  pdf.text("QTY", margin + contentWidth * 0.55, y + 5.5)
  pdf.text("UNIT", margin + contentWidth * 0.65, y + 5.5)
  pdf.text("UNIT COST", margin + contentWidth * 0.75, y + 5.5)
  pdf.text("TOTAL", margin + contentWidth * 0.9, y + 5.5)

  y += 8

  // Line items
  pdf.setFont("helvetica", "normal")
  let lineNum = 1
  let runningTotal = 0

  for (const item of data.estimateItems) {
    if (y > pageHeight - 60) {
      pdf.addPage()
      y = 20
    }

    const itemTotal = item.qty * item.price
    runningTotal += itemTotal

    pdf.setDrawColor(...COLORS.gray300)
    pdf.rect(margin, y, contentWidth, 8, "S")

    pdf.setFontSize(8)
    pdf.text(lineNum.toString(), margin + 5, y + 5.5)
    pdf.text(item.name, margin + 15, y + 5.5)
    pdf.text(item.qty.toString(), margin + contentWidth * 0.55, y + 5.5)
    pdf.text(item.unit, margin + contentWidth * 0.65, y + 5.5)
    pdf.text(`$${item.price.toFixed(2)}`, margin + contentWidth * 0.75, y + 5.5)
    pdf.setFont("helvetica", "bold")
    pdf.text(formatCurrency(itemTotal), margin + contentWidth * 0.9, y + 5.5)
    pdf.setFont("helvetica", "normal")

    y += 8
    lineNum++
  }

  // Totals section
  y += 2
  const totalsX = margin + contentWidth * 0.6
  const totalsWidth = contentWidth * 0.4

  pdf.setFillColor(...COLORS.gray100)
  pdf.rect(totalsX, y, totalsWidth, 24, "F")
  pdf.rect(totalsX, y, totalsWidth, 24, "S")

  pdf.setFontSize(9)
  pdf.text("Subtotal:", totalsX + 5, y + 8)
  pdf.text(formatCurrency(runningTotal), totalsX + totalsWidth - 5, y + 8, {
    align: "right"
  })

  pdf.text("Tax:", totalsX + 5, y + 15)
  pdf.text("$0.00", totalsX + totalsWidth - 5, y + 15, { align: "right" })

  pdf.setFillColor(...COLORS.gray800)
  pdf.rect(totalsX, y + 18, totalsWidth, 10, "F")
  pdf.setTextColor(...COLORS.white)
  pdf.setFont("helvetica", "bold")
  pdf.text("TOTAL ESTIMATE:", totalsX + 5, y + 25)
  pdf.setFontSize(11)
  pdf.text(
    formatCurrency(data.estimateTotal),
    totalsX + totalsWidth - 5,
    y + 25,
    { align: "right" }
  )

  y += 35

  // Warranty & Certification
  if (y < pageHeight - 50) {
    pdf.setTextColor(...COLORS.gray900)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "bold")
    pdf.text("CONTRACTOR CERTIFICATION", margin, y)

    y += 5
    pdf.setFillColor(...COLORS.white)
    pdf.setDrawColor(...COLORS.gray400)
    pdf.rect(margin, y, contentWidth, 30, "S")

    pdf.setFontSize(8)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(...COLORS.gray700)
    const certText = `I, the undersigned contractor, certify that this estimate accurately reflects the materials and labor required to complete the described roofing work. All work will be performed in accordance with local building codes and manufacturer specifications.`
    const certLines = pdf.splitTextToSize(certText, contentWidth - 10)
    let certY = y + 6
    for (const line of certLines) {
      pdf.text(line, margin + 5, certY)
      certY += 4
    }

    pdf.text(
      "Contractor Signature: _____________________________",
      margin + 5,
      y + 22
    )
    pdf.text(
      `Date: ${new Date().toLocaleDateString()}`,
      margin + contentWidth - 50,
      y + 22
    )

    y += 38
  }

  // Notes
  if (data.customerNotes && y < pageHeight - 30) {
    pdf.setTextColor(...COLORS.gray800)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "bold")
    pdf.text("ADDITIONAL NOTES:", margin, y)

    y += 5
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    const noteLines = pdf.splitTextToSize(data.customerNotes, contentWidth)
    for (const line of noteLines.slice(0, 4)) {
      pdf.text(line, margin, y)
      y += 4
    }
  }

  // Footer
  pdf.setFillColor(...COLORS.gray100)
  pdf.rect(0, pageHeight - 15, pageWidth, 15, "F")
  pdf.setTextColor(...COLORS.gray600)
  pdf.setFontSize(7)
  pdf.text(
    "This document is intended for insurance claim purposes. Retain for your records.",
    margin,
    pageHeight - 8
  )
  pdf.text(`${companyName} | Page 1 of 1`, pageWidth - margin, pageHeight - 8, {
    align: "right"
  })

  return pdf
}

function generateProposalPDF(data: ProposalData): jsPDF {
  // Route to appropriate template based on templateId
  switch (data.templateId) {
    case "detailed-breakdown":
      return generateDetailedBreakdownPDF(data)
    case "quick-quote":
      return generateQuickQuotePDF(data)
    case "insurance-ready":
      return generateInsuranceReadyPDF(data)
    case "professional-standard":
    default:
      return generateProfessionalStandardPDF(data)
  }
}

function generatePropertyReportPDF(data: PropertyReportData): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 0

  // Header
  pdf.setFillColor(...COLORS.primary)
  pdf.rect(0, 0, pageWidth, 50, "F")

  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(22)
  pdf.setFont("helvetica", "bold")
  pdf.text("PROPERTY REPORT", margin, 22)

  pdf.setFontSize(10)
  pdf.setFont("helvetica", "normal")
  pdf.text(data.address, margin, 32)
  pdf.text(
    `Generated: ${data.generatedDate || new Date().toLocaleDateString()}`,
    margin,
    40
  )

  // Rooftops AI logo/branding
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "bold")
  pdf.text("ROOFTOPS AI", pageWidth - margin - 35, 25)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9)
  pdf.text("AI-Powered Property Analysis", pageWidth - margin - 55, 33)

  y = 65

  // Property Overview Section
  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(14)
  pdf.setFont("helvetica", "bold")
  pdf.text("PROPERTY OVERVIEW", margin, y)

  y += 12

  // Stats grid
  const statBoxWidth = (contentWidth - 10) / 3
  const stats = [
    { label: "Roof Area", value: `${formatNumber(data.roofArea)} sq ft` },
    { label: "Roofing Squares", value: `${data.roofingSquares} squares` },
    { label: "Facets", value: `${data.facetCount} facets` }
  ]

  stats.forEach((stat, index) => {
    const x = margin + index * (statBoxWidth + 5)
    pdf.setFillColor(...COLORS.gray100)
    pdf.roundedRect(x, y, statBoxWidth, 25, 3, 3, "F")

    pdf.setTextColor(...COLORS.gray500)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "normal")
    pdf.text(stat.label, x + 5, y + 10)

    pdf.setTextColor(...COLORS.gray900)
    pdf.setFontSize(14)
    pdf.setFont("helvetica", "bold")
    pdf.text(stat.value, x + 5, y + 20)
  })

  y += 35

  // Additional details
  const details = [
    { label: "Roof Pitch", value: data.pitch || "Standard" },
    { label: "Complexity", value: data.complexity || "Moderate" },
    { label: "Condition", value: data.condition || "Good" }
  ]

  pdf.setDrawColor(...COLORS.gray200)
  details.forEach(detail => {
    pdf.setTextColor(...COLORS.gray700)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.text(detail.label + ":", margin, y)

    pdf.setTextColor(...COLORS.gray900)
    pdf.setFont("helvetica", "bold")
    pdf.text(detail.value, margin + 50, y)
    y += 8
  })

  y += 10

  // Solar Potential Section (if available)
  if (data.solarPanels && data.solarPanels > 0) {
    pdf.setTextColor(...COLORS.primary)
    pdf.setFontSize(14)
    pdf.setFont("helvetica", "bold")
    pdf.text("SOLAR POTENTIAL", margin, y)

    y += 12

    const solarStats = [
      { label: "Max Panels", value: `${data.solarPanels}` },
      {
        label: "Yearly Energy",
        value: `${formatNumber(data.yearlyEnergy || 0)} kWh`
      },
      {
        label: "Est. Savings",
        value: formatCurrency(data.netSavings || 0) + "/20yr"
      }
    ]

    solarStats.forEach((stat, index) => {
      const x = margin + index * (statBoxWidth + 5)
      pdf.setFillColor(240, 253, 250) // Light teal
      pdf.roundedRect(x, y, statBoxWidth, 25, 3, 3, "F")

      pdf.setTextColor(...COLORS.gray500)
      pdf.setFontSize(9)
      pdf.setFont("helvetica", "normal")
      pdf.text(stat.label, x + 5, y + 10)

      pdf.setTextColor(...COLORS.primary)
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.text(stat.value, x + 5, y + 20)
    })

    y += 35
  }

  // Recommendations Section
  if (data.recommendations && data.recommendations.length > 0) {
    if (y > pageHeight - 60) {
      pdf.addPage()
      y = 30
    }

    pdf.setTextColor(...COLORS.primary)
    pdf.setFontSize(14)
    pdf.setFont("helvetica", "bold")
    pdf.text("RECOMMENDATIONS", margin, y)

    y += 10

    pdf.setTextColor(...COLORS.gray700)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")

    data.recommendations.forEach(rec => {
      if (y > pageHeight - 30) return
      pdf.text("• " + rec, margin + 5, y)
      y += 7
    })
  }

  // Footer
  pdf.setFillColor(...COLORS.gray100)
  pdf.rect(0, pageHeight - 20, pageWidth, 20, "F")

  pdf.setTextColor(...COLORS.gray500)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "normal")
  pdf.text(
    "This report was generated by Rooftops AI • rooftops.ai",
    margin,
    pageHeight - 10
  )
  pdf.text(
    "AI-powered property analysis for roofing professionals",
    pageWidth - margin - 80,
    pageHeight - 10
  )

  return pdf
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    let pdf: jsPDF

    if (type === "proposal") {
      pdf = generateProposalPDF(data as ProposalData)
    } else if (type === "property-report") {
      pdf = generatePropertyReportPDF(data as PropertyReportData)
    } else {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      )
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"))

    // Return PDF as blob
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}_${Date.now()}.pdf"`
      }
    })
  } catch (error) {
    console.error("[PDF Generation] Error:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
