"use client"

import React, { useState, useCallback, useRef } from "react"
import {
  IconFileText,
  IconDownload,
  IconMail,
  IconPencil,
  IconPhoto,
  IconX,
  IconChevronRight,
  IconSparkles,
  IconBuildingStore,
  IconHome,
  IconShieldCheck,
  IconClock,
  IconCurrencyDollar,
  IconLoader2,
  IconUpload,
  IconTrash,
  IconList,
  IconLayoutList,
  IconCheck
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

// Theme colors matching Rooftops AI
const theme = {
  primary: "#0D9488",
  primaryLight: "#14B8A6",
  primaryDark: "#0F766E",
  primaryBg: "#F0FDFA",
  accent: "#F59E0B",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  white: "#FFFFFF"
}

interface ProposalTemplate {
  id: string
  name: string
  description: string
  category: "professional" | "simple" | "detailed" | "insurance"
  preview: string
  popular?: boolean
  headerColor: string
  accentColor: string
}

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: "professional-standard",
    name: "Professional Standard",
    description:
      "Clean, modern teal design perfect for residential customers. Includes warranty section and professional formatting.",
    category: "professional",
    preview: "professional",
    popular: true,
    headerColor: "bg-teal-500",
    accentColor: "border-teal-200"
  },
  {
    id: "detailed-breakdown",
    name: "Detailed Breakdown",
    description:
      "Navy blue corporate style with 5-column itemized table, payment terms, and comprehensive specifications.",
    category: "detailed",
    preview: "detailed",
    headerColor: "bg-blue-900",
    accentColor: "border-blue-200"
  },
  {
    id: "quick-quote",
    name: "Quick Quote",
    description:
      "Minimal one-page design for fast quotes. Simple line items with a bold total section.",
    category: "simple",
    preview: "simple",
    headerColor: "bg-teal-500",
    accentColor: "border-gray-200"
  },
  {
    id: "insurance-ready",
    name: "Insurance Ready",
    description:
      "Official form-style document for insurance claims. Includes contractor certification and line-numbered items.",
    category: "insurance",
    preview: "insurance",
    headerColor: "bg-gray-800",
    accentColor: "border-amber-300"
  }
]

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  website: string
  license: string
  logo?: string
}

interface ProposalData {
  customerName: string
  customerAddress: string
  customerEmail: string
  customerPhone: string
  propertyAddress: string
  roofSize: number
  estimateTotal: number
  estimateItems: Array<{
    name: string
    qty: number
    unit: string
    price: number
    total: number
  }>
  validUntil?: string
  notes?: string
  warranty?: string
}

interface EditableEstimateItem {
  id: string
  name: string
  description?: string
  qty: number
  unit: string
  price: number
}

interface ProposalTemplatesProps {
  estimateItems: Array<{
    id: string
    name: string
    description?: string
    qty: number
    unit: string
    price: number
  }>
  estimateTotal: number
  propertyAddress: string
  roofSize: number
  onClose: () => void
  companyInfo?: CompanyInfo
}

export function ProposalTemplates({
  estimateItems,
  estimateTotal,
  propertyAddress,
  roofSize,
  onClose,
  companyInfo
}: ProposalTemplatesProps) {
  const [step, setStep] = useState<"select" | "customize" | "preview">("select")
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProposalTemplate | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerNotes, setCustomerNotes] = useState("")
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeWarranty, setIncludeWarranty] = useState(true)
  const [includePaymentTerms, setIncludePaymentTerms] = useState(true)
  const [validDays, setValidDays] = useState(30)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Editable estimate items
  const [editableItems, setEditableItems] = useState<EditableEstimateItem[]>(
    estimateItems.map(item => ({
      ...item,
      description: item.description || ""
    }))
  )
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Estimate display mode: itemized shows all line items, summary shows only total
  const [estimateDisplayMode, setEstimateDisplayMode] = useState<
    "itemized" | "summary"
  >("itemized")

  // Business/Company branding
  const [businessName, setBusinessName] = useState(companyInfo?.name || "")
  const [businessLicense, setBusinessLicense] = useState(
    companyInfo?.license || ""
  )
  const [businessLogo, setBusinessLogo] = useState<string | null>(
    companyInfo?.logo || null
  )
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file (PNG, JPG, etc.)")
        return
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("Logo file size must be under 2MB")
        return
      }

      setIsUploadingLogo(true)

      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        setBusinessLogo(result)
        setIsUploadingLogo(false)
      }
      reader.onerror = () => {
        alert("Failed to read logo file. Please try again.")
        setIsUploadingLogo(false)
      }
      reader.readAsDataURL(file)
    },
    []
  )

  const handleRemoveLogo = useCallback(() => {
    setBusinessLogo(null)
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculate total from editable items
  const editableTotal = editableItems.reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  )

  // Update an editable item
  const updateEditableItem = (
    id: string,
    updates: Partial<EditableEstimateItem>
  ) => {
    setEditableItems(items =>
      items.map(item => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const handleSelectTemplate = useCallback((template: ProposalTemplate) => {
    setSelectedTemplate(template)
    setStep("customize")
  }, [])

  const handleGenerateProposal = useCallback(() => {
    setStep("preview")
  }, [])

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Generate PDF using the API
      const response = await fetch("/api/reports/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "proposal",
          data: {
            customerName,
            customerEmail,
            customerPhone,
            propertyAddress,
            roofSize,
            estimateItems: editableItems,
            estimateTotal: editableTotal,
            validDays,
            includeWarranty,
            customerNotes,
            templateId: selectedTemplate?.id || "professional-standard",
            displayMode: estimateDisplayMode,
            companyInfo: {
              ...companyInfo,
              name: businessName || companyInfo?.name || "Your Roofing Company",
              license: businessLicense || companyInfo?.license,
              logo: businessLogo || companyInfo?.logo
            }
          }
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Proposal_${customerName.replace(/\s+/g, "_")}_${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert("Failed to generate PDF. Please try again.")
      }
    } catch (error) {
      console.error("PDF generation error:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSendEmail = async () => {
    if (!customerEmail) {
      alert("Please enter a customer email address")
      return
    }

    setIsSendingEmail(true)
    try {
      const response = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "proposal",
          recipientEmail: customerEmail,
          recipientName: customerName,
          data: {
            customerName,
            customerEmail,
            customerPhone,
            propertyAddress,
            roofSize,
            estimateItems: editableItems,
            estimateTotal: editableTotal,
            validDays,
            includeWarranty,
            customerNotes,
            displayMode: estimateDisplayMode,
            companyInfo: {
              ...companyInfo,
              name: businessName || companyInfo?.name || "Your Roofing Company",
              license: businessLicense || companyInfo?.license,
              logo: businessLogo || companyInfo?.logo
            }
          }
        })
      })

      if (response.ok) {
        alert(`Proposal sent successfully to ${customerEmail}!`)
      } else {
        const error = await response.json()
        // Check for specific error about email service not configured
        if (
          error.error?.includes("Email service not configured") ||
          error.error?.includes("RESEND_API_KEY")
        ) {
          alert(
            "Email service is not configured yet. Please download the PDF instead, or contact support to enable email sending."
          )
        } else {
          alert(
            error.error ||
              error.message ||
              "Failed to send email. Please try again."
          )
        }
      }
    } catch (error) {
      console.error("Email sending error:", error)
      alert("Failed to send email. Please try again.")
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gray-50 shadow-2xl">
        {/* Fixed Close Button Header */}
        <div className="flex shrink-0 items-center justify-end border-b border-gray-200 bg-gray-50 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <IconX className="size-5" />
          </button>
        </div>

        {/* Scrollable Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Template Selection */}
          {step === "select" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Choose a Proposal Template
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select a template that best fits your customer&apos;s needs
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {PROPOSAL_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:shadow-lg",
                      template.popular
                        ? "border-teal-300 bg-teal-50/50 hover:border-teal-500"
                        : `${template.accentColor} bg-white hover:border-teal-500`
                    )}
                  >
                    {template.popular && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        <IconSparkles className="size-3" />
                        Popular
                      </div>
                    )}

                    {/* Template Preview - Different for each type */}
                    <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-white">
                      {template.id === "professional-standard" && (
                        <div className="flex h-full flex-col">
                          <div className="h-8 bg-teal-500 px-2 py-1">
                            <div className="h-2 w-16 rounded bg-white/80"></div>
                            <div className="mt-0.5 h-1.5 w-12 rounded bg-white/50"></div>
                          </div>
                          <div className="flex-1 p-2">
                            <div className="mb-2 flex gap-2">
                              <div className="h-8 flex-1 rounded bg-gray-100 p-1">
                                <div className="h-1 w-8 rounded bg-gray-300"></div>
                              </div>
                              <div className="h-8 flex-1 rounded bg-gray-100 p-1">
                                <div className="h-1 w-8 rounded bg-gray-300"></div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <div className="h-1.5 w-20 rounded bg-gray-200"></div>
                                <div className="h-1.5 w-8 rounded bg-gray-200"></div>
                              </div>
                              <div className="flex justify-between">
                                <div className="h-1.5 w-16 rounded bg-gray-200"></div>
                                <div className="h-1.5 w-8 rounded bg-gray-200"></div>
                              </div>
                            </div>
                            <div className="mt-2 h-4 rounded bg-teal-500"></div>
                          </div>
                        </div>
                      )}
                      {template.id === "detailed-breakdown" && (
                        <div className="flex h-full flex-col">
                          <div className="h-7 bg-blue-900 px-2 py-1">
                            <div className="h-2 w-16 rounded bg-white/80"></div>
                          </div>
                          <div className="h-1 bg-amber-400"></div>
                          <div className="flex-1 p-2">
                            <div className="mb-2 flex gap-1">
                              <div className="h-6 flex-1 rounded border border-gray-200 p-1">
                                <div className="h-1 w-full rounded bg-blue-900"></div>
                              </div>
                              <div className="h-6 flex-1 rounded border border-gray-200 p-1">
                                <div className="h-1 w-full rounded bg-blue-900"></div>
                              </div>
                            </div>
                            <div className="h-3 rounded bg-blue-900"></div>
                            <div className="mt-1 space-y-0.5">
                              <div className="h-1.5 rounded bg-gray-100"></div>
                              <div className="h-1.5 rounded bg-white"></div>
                              <div className="h-1.5 rounded bg-gray-100"></div>
                            </div>
                            <div className="ml-auto mt-1 h-4 w-16 rounded bg-blue-900"></div>
                          </div>
                        </div>
                      )}
                      {template.id === "quick-quote" && (
                        <div className="flex h-full flex-col">
                          <div className="h-2 bg-teal-500"></div>
                          <div className="flex-1 p-2">
                            <div className="flex items-center justify-between">
                              <div className="h-3 w-20 rounded bg-gray-800"></div>
                              <div className="h-4 w-12 rounded bg-teal-500"></div>
                            </div>
                            <div className="my-2 h-px bg-gray-200"></div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <div className="h-1.5 w-24 rounded bg-gray-300"></div>
                                <div className="h-1.5 w-8 rounded bg-gray-300"></div>
                              </div>
                              <div className="flex justify-between">
                                <div className="h-1.5 w-20 rounded bg-gray-300"></div>
                                <div className="h-1.5 w-8 rounded bg-gray-300"></div>
                              </div>
                            </div>
                            <div className="mt-2 h-6 rounded-lg bg-teal-500 p-1">
                              <div className="h-full w-12 rounded bg-white/30"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {template.id === "insurance-ready" && (
                        <div className="flex h-full flex-col">
                          <div className="flex h-6 items-center justify-between bg-gray-800 px-2">
                            <div className="h-2 w-16 rounded bg-white/80"></div>
                            <div className="h-3 w-10 rounded bg-amber-400"></div>
                          </div>
                          <div className="flex-1 p-2">
                            <div className="mb-1 h-2 w-24 rounded bg-gray-200"></div>
                            <div className="mb-2 space-y-0.5">
                              <div className="flex gap-1">
                                <div className="h-1 w-8 rounded bg-gray-400"></div>
                                <div className="h-1 flex-1 border-b border-gray-300"></div>
                              </div>
                              <div className="flex gap-1">
                                <div className="h-1 w-8 rounded bg-gray-400"></div>
                                <div className="h-1 flex-1 border-b border-gray-300"></div>
                              </div>
                            </div>
                            <div className="h-2 rounded bg-gray-200"></div>
                            <div className="mt-1 space-y-0.5">
                              <div className="h-1.5 rounded border border-gray-300"></div>
                              <div className="h-1.5 rounded border border-gray-300"></div>
                            </div>
                            <div className="ml-auto mt-1 h-3 w-12 rounded bg-gray-800"></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="font-semibold text-gray-900 group-hover:text-teal-600">
                      {template.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {template.description}
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Select template <IconChevronRight className="size-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Customization */}
          {step === "customize" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep("select")}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Customize Your Proposal
                  </h2>
                  <p className="text-sm text-gray-500">
                    Template: {selectedTemplate?.name}
                  </p>
                </div>
              </div>

              {/* Your Business Information */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <IconBuildingStore className="size-4 text-teal-500" />
                  Your Business Information
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="ABC Roofing Company"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      License Number
                    </label>
                    <input
                      type="text"
                      value={businessLicense}
                      onChange={e => setBusinessLicense(e.target.value)}
                      placeholder="License #12345"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Company Logo
                    </label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {businessLogo ? (
                      <div className="flex items-center gap-3">
                        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                          <img
                            src={businessLogo}
                            alt="Company logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-500">
                            Logo uploaded
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                          >
                            <IconTrash className="size-3" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500 transition-colors hover:border-teal-400 hover:text-teal-600"
                      >
                        {isUploadingLogo ? (
                          <>
                            <IconLoader2 className="size-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <IconUpload className="size-4" />
                            Upload Logo (PNG, JPG - max 2MB)
                          </>
                        )}
                      </button>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      Your logo will appear in the proposal header
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <IconHome className="size-4 text-teal-500" />
                  Customer Information
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Property Address
                    </label>
                    <input
                      type="text"
                      value={propertyAddress}
                      disabled
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Proposal Options */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <IconPencil className="size-4 text-teal-500" />
                  Proposal Options
                </h3>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includePhotos}
                      onChange={e => setIncludePhotos(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <div className="flex items-center gap-2">
                      <IconPhoto className="size-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        Include property photos
                      </span>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeWarranty}
                      onChange={e => setIncludeWarranty(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <div className="flex items-center gap-2">
                      <IconShieldCheck className="size-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        Include warranty information
                      </span>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includePaymentTerms}
                      onChange={e => setIncludePaymentTerms(e.target.checked)}
                      className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <div className="flex items-center gap-2">
                      <IconCurrencyDollar className="size-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        Include payment terms
                      </span>
                    </div>
                  </label>
                  <div className="flex items-center gap-3">
                    <IconClock className="size-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Valid for</span>
                    <select
                      value={validDays}
                      onChange={e => setValidDays(parseInt(e.target.value))}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                    >
                      <option value={15}>15 days</option>
                      <option value={30}>30 days</option>
                      <option value={45}>45 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Estimate Display Mode */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <IconLayoutList className="size-4 text-teal-500" />
                  Estimate Display
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEstimateDisplayMode("itemized")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all",
                      estimateDisplayMode === "itemized"
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <IconList className="size-4" />
                    Itemized
                    {estimateDisplayMode === "itemized" && (
                      <IconCheck className="size-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEstimateDisplayMode("summary")}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all",
                      estimateDisplayMode === "summary"
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <IconCurrencyDollar className="size-4" />
                    Summary Only
                    {estimateDisplayMode === "summary" && (
                      <IconCheck className="size-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {estimateDisplayMode === "itemized"
                    ? "Shows all individual line items with quantities and prices"
                    : "Shows only the total amount without line item details"}
                </p>
              </div>

              {/* Editable Line Items */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <IconList className="size-4 text-teal-500" />
                  Line Items
                  <span className="ml-auto text-xs font-normal text-gray-400">
                    Click to edit
                  </span>
                </h3>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {editableItems.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all",
                        editingItemId === item.id
                          ? "border-teal-400 bg-teal-50"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      )}
                    >
                      {editingItemId === item.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-[10px] font-medium text-gray-500">
                                Item Name
                              </label>
                              <input
                                type="text"
                                value={item.name}
                                onChange={e =>
                                  updateEditableItem(item.id, {
                                    name: e.target.value
                                  })
                                }
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-medium text-gray-500">
                                Description
                              </label>
                              <input
                                type="text"
                                value={item.description || ""}
                                onChange={e =>
                                  updateEditableItem(item.id, {
                                    description: e.target.value
                                  })
                                }
                                placeholder="Optional description"
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="mb-1 block text-[10px] font-medium text-gray-500">
                                Quantity
                              </label>
                              <input
                                type="number"
                                value={item.qty}
                                onChange={e =>
                                  updateEditableItem(item.id, {
                                    qty: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-medium text-gray-500">
                                Unit
                              </label>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={e =>
                                  updateEditableItem(item.id, {
                                    unit: e.target.value
                                  })
                                }
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-medium text-gray-500">
                                Unit Price ($)
                              </label>
                              <input
                                type="number"
                                value={item.price}
                                onChange={e =>
                                  updateEditableItem(item.id, {
                                    price: parseFloat(e.target.value) || 0
                                  })
                                }
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-sm font-medium text-teal-700">
                              Line Total:{" "}
                              {formatCurrency(item.qty * item.price)}
                            </span>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="rounded bg-teal-500 px-3 py-1 text-xs font-medium text-white hover:bg-teal-600"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingItemId(item.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-800">
                                {item.name}
                              </div>
                              {item.description && (
                                <div className="text-xs text-gray-500">
                                  {item.description}
                                </div>
                              )}
                              <div className="mt-1 text-xs text-gray-400">
                                {item.qty} {item.unit} × $
                                {item.price.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {formatCurrency(item.qty * item.price)}
                              </div>
                              <IconPencil className="ml-auto mt-1 size-3 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <IconFileText className="size-4 text-teal-500" />
                  Additional Notes
                </h3>
                <textarea
                  value={customerNotes}
                  onChange={e => setCustomerNotes(e.target.value)}
                  placeholder="Add any special terms, conditions, or notes for this proposal..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Estimate Summary */}
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-teal-800">
                  Estimate Summary
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-teal-600">
                      {editableItems.length} items • {roofSize} squares
                    </div>
                  </div>
                  <div className="text-xl font-bold text-teal-700">
                    {formatCurrency(editableTotal)}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateProposal}
                disabled={!customerName}
                className={cn(
                  "w-full rounded-xl py-4 text-base font-semibold transition-all",
                  customerName
                    ? "bg-teal-500 text-white hover:bg-teal-600"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
                )}
              >
                Generate Proposal →
              </button>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep("customize")}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    ←
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Proposal Preview
                    </h2>
                    <p className="text-sm text-gray-500">
                      Ready to send to {customerName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Proposal Preview */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {/* Header */}
                <div className="bg-teal-500 p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {businessLogo && (
                        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5">
                          <img
                            src={businessLogo}
                            alt="Company logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <div>
                        <div className="text-2xl font-bold">
                          {businessName ||
                            companyInfo?.name ||
                            "Your Roofing Company"}
                        </div>
                        <div className="mt-1 text-sm opacity-90">
                          Licensed & Insured •{" "}
                          {businessLicense ||
                            companyInfo?.license ||
                            "License #12345"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">PROPOSAL</div>
                      <div className="opacity-90">
                        #{Date.now().toString().slice(-6)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="border-b border-gray-100 p-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-gray-400">
                        Prepared For
                      </div>
                      <div className="font-semibold text-gray-900">
                        {customerName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {propertyAddress}
                      </div>
                      {customerEmail && (
                        <div className="text-sm text-gray-600">
                          {customerEmail}
                        </div>
                      )}
                      {customerPhone && (
                        <div className="text-sm text-gray-600">
                          {customerPhone}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="mb-1 text-xs font-semibold uppercase text-gray-400">
                        Project Details
                      </div>
                      <div className="text-sm text-gray-600">
                        Roof Size: {roofSize} squares
                      </div>
                      <div className="text-sm text-gray-600">
                        Valid Until:{" "}
                        {new Date(
                          Date.now() + validDays * 24 * 60 * 60 * 1000
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items or Summary */}
                <div className="p-6">
                  {estimateDisplayMode === "itemized" ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
                          <th className="pb-2">Description</th>
                          <th className="pb-2 text-right">Qty</th>
                          <th className="pb-2 text-right">Rate</th>
                          <th className="pb-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editableItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-3">
                              <div className="text-sm text-gray-800">
                                {item.name}
                              </div>
                              {item.description && (
                                <div className="text-xs text-gray-500">
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 text-right text-sm text-gray-600">
                              {item.qty} {item.unit}
                            </td>
                            <td className="py-3 text-right text-sm text-gray-600">
                              ${item.price.toFixed(2)}
                            </td>
                            <td className="py-3 text-right text-sm font-medium text-gray-800">
                              {formatCurrency(item.qty * item.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td
                            colSpan={3}
                            className="pt-4 text-right text-lg font-bold text-gray-900"
                          >
                            Total
                          </td>
                          <td className="pt-4 text-right text-lg font-bold text-teal-600">
                            {formatCurrency(editableTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="rounded-xl border-2 border-teal-200 bg-teal-50 p-6 text-center">
                      <div className="text-sm font-medium text-gray-600">
                        Complete Roof Replacement
                      </div>
                      <div className="text-xs text-gray-500">
                        {roofSize} squares • Labor, Materials & Disposal
                        Included
                      </div>
                      <div className="mt-4 text-4xl font-bold text-teal-600">
                        {formatCurrency(editableTotal)}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        All materials, labor, tear-off, and cleanup included
                      </div>
                    </div>
                  )}
                </div>

                {/* Warranty Section */}
                {includeWarranty && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    <div className="flex items-start gap-3">
                      <IconShieldCheck className="mt-0.5 size-5 text-teal-500" />
                      <div>
                        <div className="font-semibold text-gray-900">
                          Warranty Information
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          Workmanship warranty: 10 years • Manufacturer
                          warranty: 30 years on shingles
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {customerNotes && (
                  <div className="border-t border-gray-100 p-6">
                    <div className="text-xs font-semibold uppercase text-gray-400">
                      Notes
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {customerNotes}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <>
                      <IconLoader2 className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <IconDownload className="size-4" />
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !customerEmail}
                  className="flex items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <IconLoader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <IconMail className="size-4" />
                      Send via Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Export button component to trigger proposals from estimate builder
export function CreateProposalButton({
  estimateItems,
  estimateTotal,
  propertyAddress,
  roofSize,
  disabled = false
}: {
  estimateItems: Array<{
    id: string
    name: string
    qty: number
    unit: string
    price: number
  }>
  estimateTotal: number
  propertyAddress: string
  roofSize: number
  disabled?: boolean
}) {
  const [showProposals, setShowProposals] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowProposals(true)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
          disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-400"
            : "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30"
        )}
      >
        <IconFileText className="size-4" />
        Create Proposal
      </button>

      {showProposals && (
        <ProposalTemplates
          estimateItems={estimateItems}
          estimateTotal={estimateTotal}
          propertyAddress={propertyAddress}
          roofSize={roofSize}
          onClose={() => setShowProposals(false)}
        />
      )}
    </>
  )
}
