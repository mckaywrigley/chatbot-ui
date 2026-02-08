"use client"

import { useState, useEffect } from "react"
import {
  IconX,
  IconLoader2,
  IconMicrophone,
  IconPlayerStop
} from "@tabler/icons-react"
import { VoiceInput } from "./voice-input"

interface Customer {
  id?: string
  name: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status: string
  source?: string
  notes?: string
  tags?: string[]
  propertyType?: string
  preferredContactMethod?: string
}

interface CustomerModalProps {
  customer: Customer | null
  onSave: (customer: Partial<Customer>) => Promise<void>
  onClose: () => void
}

const statusOptions = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Customer" },
  { value: "inactive", label: "Inactive" },
  { value: "do_not_contact", label: "Do Not Contact" }
]

const sourceOptions = [
  { value: "web_form", label: "Web Form" },
  { value: "referral", label: "Referral" },
  { value: "home_advisor", label: "HomeAdvisor" },
  { value: "angi", label: "Angi" },
  { value: "storm_lead", label: "Storm Lead" },
  { value: "door_knock", label: "Door Knock" },
  { value: "cold_call", label: "Cold Call" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "other", label: "Other" }
]

const propertyTypeOptions = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "industrial", label: "Industrial" }
]

const contactMethodOptions = [
  { value: "any", label: "Any" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" }
]

export function CustomerModal({
  customer,
  onSave,
  onClose
}: CustomerModalProps) {
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    email: "",
    phone: "",
    secondaryPhone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    status: "lead",
    source: "",
    notes: "",
    tags: [],
    propertyType: "",
    preferredContactMethod: "any"
  })
  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        secondaryPhone: customer.secondaryPhone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zip: customer.zip || "",
        status: customer.status || "lead",
        source: customer.source || "",
        notes: customer.notes || "",
        tags: customer.tags || [],
        propertyType: customer.propertyType || "",
        preferredContactMethod: customer.preferredContactMethod || "any"
      })
    }
  }, [customer])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }))
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header - fixed */}
        <div className="flex shrink-0 items-center justify-between border-b px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {customer ? "Edit Customer" : "Add Customer"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Form - scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Voice Input - AI-native feature */}
            {!customer && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
                <div className="mb-2 flex items-center gap-2">
                  <IconMicrophone className="text-purple-600" size={20} />
                  <h3 className="font-medium text-purple-900 dark:text-purple-100">
                    Quick Add with Voice
                  </h3>
                </div>
                <p className="mb-3 text-sm text-purple-700 dark:text-purple-300">
                  Speak the customer details and AI will fill the form
                  automatically.
                </p>
                <VoiceInput
                  onTranscript={text => console.log("Transcript:", text)}
                  onParsedData={data => {
                    setFormData(prev => ({
                      ...prev,
                      ...data,
                      // Preserve existing values for fields not in voice input
                      status: data.status || prev.status,
                      preferredContactMethod:
                        data.preferredContactMethod ||
                        prev.preferredContactMethod
                    }))
                  }}
                  placeholder="Speak customer details"
                  parsePrompt={`Extract customer information from the voice transcript.
Return JSON with: name, phone, email, address, city, state, zip, notes, propertyType, source, status.
Only include fields that are clearly mentioned. Format phone as +1 XXX-XXX-XXXX.`}
                />
              </div>
            )}

            {/* Basic Info */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm text-gray-600">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Secondary Phone
                  </label>
                  <input
                    type="tel"
                    name="secondaryPhone"
                    value={formData.secondaryPhone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="+1 (555) 987-6543"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Preferred Contact
                  </label>
                  <select
                    name="preferredContactMethod"
                    value={formData.preferredContactMethod}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {contactMethodOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Address
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm text-gray-600">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Denver"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="CO"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">
                      ZIP
                    </label>
                    <input
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="80202"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Source */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Classification
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Lead Source
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select source</option>
                    {sourceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Property Type
                  </label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select type</option>
                    {propertyTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">Tags</h3>
              <div className="mb-2 flex flex-wrap gap-2">
                {formData.tags?.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="rounded-full p-0.5 hover:bg-purple-200"
                    >
                      <IconX size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyPress={e =>
                    e.key === "Enter" && (e.preventDefault(), handleAddTag())
                  }
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">Notes</h3>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Add any notes about this customer..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              {customer ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
