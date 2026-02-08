// components > explore > PropertyPreviewDrawer.tsx

"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  IconX,
  IconSatellite,
  IconWalk,
  IconRulerMeasure,
  IconSquare,
  IconTriangle,
  IconChevronDown,
  IconChevronRight,
  IconSparkles,
  IconLoader2,
  IconCompass,
  IconClock,
  IconShieldCheck
} from "@tabler/icons-react"
import { RooftopsSVG } from "@/components/icons/rooftops-svg"
import {
  extractSolarRoofMetrics,
  type SolarRoofMetrics
} from "@/lib/solar-data-extractor"

interface PropertyPreviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  address: string
  location: { lat: number; lng: number } | null
  onGenerateFullReport: () => void
  isAnalyzing: boolean
  /** When true, shows landing-page-specific CTA with feature list and sign-up messaging */
  landingMode?: boolean
}

// Compass direction from azimuth degrees
function azimuthToDirection(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return dirs[Math.round(deg / 45) % 8]
}

// Quality badge color mapping
function qualityColor(q: string): { bg: string; text: string; dot: string } {
  switch (q) {
    case "HIGH":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500"
      }
    case "MEDIUM":
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" }
    default:
      return { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" }
  }
}

const PropertyPreviewDrawer: React.FC<PropertyPreviewDrawerProps> = ({
  isOpen,
  onClose,
  address,
  location,
  onGenerateFullReport,
  isAnalyzing,
  landingMode = false
}) => {
  const [activeImageTab, setActiveImageTab] = useState<"satellite" | "street">(
    "satellite"
  )
  const [solarMetrics, setSolarMetrics] = useState<SolarRoofMetrics | null>(
    null
  )
  const [isLoadingSolar, setIsLoadingSolar] = useState(false)
  const [solarError, setSolarError] = useState(false)
  const [segmentsExpanded, setSegmentsExpanded] = useState(false)
  const [imageLoaded, setImageLoaded] = useState({
    satellite: false,
    street: false
  })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLEMAPS_API_KEY || ""

  // Fetch solar data when location changes
  const fetchSolarData = useCallback(async (lat: number, lng: number) => {
    setIsLoadingSolar(true)
    setSolarError(false)
    setSolarMetrics(null)
    setSegmentsExpanded(false)

    try {
      const response = await fetch("/api/solar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng })
      })

      if (!response.ok) {
        throw new Error("Solar API request failed")
      }

      const data = await response.json()
      const metrics = extractSolarRoofMetrics(data)
      setSolarMetrics(metrics)

      // Track instant report usage (fire-and-forget)
      fetch("/api/usage/track-instant-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, lat, lng })
      }).catch(() => {}) // Silent fail — don't block UX
    } catch (err) {
      console.error("Failed to fetch solar data:", err)
      setSolarError(true)
    } finally {
      setIsLoadingSolar(false)
    }
  }, [])

  useEffect(() => {
    if (location && isOpen) {
      fetchSolarData(location.lat, location.lng)
      setImageLoaded({ satellite: false, street: false })
      setActiveImageTab("satellite")
    }
  }, [location?.lat, location?.lng, isOpen, fetchSolarData])

  // Image URLs
  const satelliteUrl = location
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=20&size=640x400&scale=2&maptype=satellite&key=${apiKey}`
    : ""
  const streetViewUrl = location
    ? `https://maps.googleapis.com/maps/api/streetview?size=640x400&scale=2&location=${location.lat},${location.lng}&fov=90&key=${apiKey}`
    : ""

  // Short address for display
  const shortAddress = address
    ? address.length > 60
      ? address.substring(0, 57) + "..."
      : address
    : "Selected Property"

  return (
    <>
      {/* Drawer panel — no overlay, map remains interactive */}
      <div
        className={`fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-l border-gray-200/80 bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[420px]${
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        style={{
          boxShadow: isOpen
            ? "-8px 0 30px -5px rgba(0,0,0,0.12), -2px 0 8px -2px rgba(0,0,0,0.06)"
            : "none"
        }}
      >
        {/* ━━━ HEADER ━━━ */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 pb-4 pt-5">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 p-1.5">
            <RooftopsSVG className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Property Preview
            </p>
            <h2
              className="mt-0.5 truncate text-[15px] font-semibold leading-snug text-gray-900"
              title={address}
            >
              {shortAddress}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close preview"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* ━━━ SCROLLABLE CONTENT ━━━ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* IMAGE SECTION */}
          <div className="px-5 pt-4">
            {/* Image tab toggle */}
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setActiveImageTab("satellite")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                  activeImageTab === "satellite"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <IconSatellite size={14} />
                Satellite
              </button>
              <button
                onClick={() => setActiveImageTab("street")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                  activeImageTab === "street"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <IconWalk size={14} />
                Street View
              </button>
            </div>

            {/* Image display */}
            <div className="relative overflow-hidden rounded-xl bg-gray-100">
              <div className="aspect-[16/10]">
                {/* Satellite image */}
                <img
                  src={satelliteUrl}
                  alt="Satellite view"
                  className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
                    activeImageTab === "satellite" ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() =>
                    setImageLoaded(prev => ({ ...prev, satellite: true }))
                  }
                />
                {/* Street view image */}
                <img
                  src={streetViewUrl}
                  alt="Street view"
                  className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${
                    activeImageTab === "street" ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() =>
                    setImageLoaded(prev => ({ ...prev, street: true }))
                  }
                />

                {/* Loading shimmer overlay */}
                {!imageLoaded[activeImageTab] && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
                )}
              </div>

              {/* Coordinates chip */}
              {location && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium tabular-nums text-white/90 backdrop-blur-sm">
                  <IconCompass size={11} />
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {/* ━━━ INSTANT METRICS ━━━ */}
          <div className="px-5 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-400">
                Roof Estimates
              </h3>
              {solarMetrics && (
                <QualityBadge quality={solarMetrics.dataQuality} />
              )}
            </div>

            {isLoadingSolar ? (
              <MetricsSkeleton />
            ) : solarError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">
                  Solar data unavailable
                </p>
                <p className="mt-0.5 text-xs text-amber-600">
                  Google Solar API data isn&apos;t available for this location.
                  You can still generate a full AI report.
                </p>
              </div>
            ) : solarMetrics ? (
              <>
                {/* 2x2 Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <MetricCard
                    label="Roof Area"
                    value={solarMetrics.totalRoofAreaSqFt.toLocaleString()}
                    unit="sq ft"
                    icon={<IconRulerMeasure size={15} />}
                  />
                  <MetricCard
                    label="Squares"
                    value={solarMetrics.roofingSquares.toString()}
                    unit="sq"
                    icon={<IconSquare size={15} />}
                  />
                  <MetricCard
                    label="Segments"
                    value={solarMetrics.roofSegmentCount.toString()}
                    unit="facets"
                    icon={<IconTriangle size={15} />}
                  />
                  <MetricCard
                    label="Pitch"
                    value={solarMetrics.predominantPitch}
                    unit="rise/run"
                    icon={
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 20h18" />
                        <path d="M3 20L12 6l9 14" />
                      </svg>
                    }
                  />
                </div>

                {/* Imagery info row */}
                <div className="mt-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-[11px] text-gray-500">
                    Imagery:{" "}
                    <span className="font-medium text-gray-700">
                      {solarMetrics.imageryDate !== "Unknown"
                        ? solarMetrics.imageryDate
                        : "Date unknown"}
                    </span>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-[11px] text-gray-500">
                    Building:{" "}
                    <span className="font-medium text-gray-700">
                      {solarMetrics.buildingAreaSqFt.toLocaleString()} sq ft
                    </span>
                  </span>
                </div>

                {/* ━━━ SEGMENT DETAILS (collapsible) ━━━ */}
                {solarMetrics.segments.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setSegmentsExpanded(!segmentsExpanded)}
                      className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="text-xs font-semibold text-gray-600">
                        {solarMetrics.segments.length} Roof Segments
                      </span>
                      {segmentsExpanded ? (
                        <IconChevronDown size={14} className="text-gray-400" />
                      ) : (
                        <IconChevronRight size={14} className="text-gray-400" />
                      )}
                    </button>

                    {segmentsExpanded && (
                      <div className="space-y-1 pb-1">
                        {solarMetrics.segments.map((seg, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex size-5 items-center justify-center rounded bg-gray-200 text-[10px] font-bold text-gray-600">
                                {i + 1}
                              </div>
                              <span className="text-xs font-medium text-gray-700">
                                {seg.areaSqFt.toLocaleString()} sq ft
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] tabular-nums text-gray-500">
                                {seg.pitchRatio}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {azimuthToDirection(seg.azimuthDegrees)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* ━━━ CTA SECTION ━━━ */}
          <div className="px-5 pb-6 pt-5">
            {landingMode && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-400">
                  Unlock with free account
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { icon: "📊", label: "Full AI Roof Report" },
                    { icon: "💰", label: "Instant Cost Estimates" },
                    { icon: "☀️", label: "Solar Panel Analysis" },
                    { icon: "🤖", label: "Custom AI Chat Assistant" },
                    { icon: "📋", label: "Proposal & Invoice Generator" }
                  ].map(feat => (
                    <div
                      key={feat.label}
                      className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm">{feat.icon}</span>
                      <span className="text-xs font-medium text-gray-700">
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onGenerateFullReport}
              disabled={isAnalyzing}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-600 via-emerald-600 to-green-600 px-5 py-4 text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {/* Subtle animated shimmer */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  animation: "shimmerSlide 2s ease-in-out infinite"
                }}
              />

              <div className="relative flex items-center justify-center gap-2.5">
                {isAnalyzing ? (
                  <>
                    <IconLoader2 size={20} className="animate-spin" />
                    <span className="text-[15px] font-bold tracking-tight">
                      Generating Report...
                    </span>
                  </>
                ) : (
                  <>
                    <IconSparkles size={20} />
                    <span className="text-[15px] font-bold tracking-tight">
                      {landingMode
                        ? "See the Full Report — Free"
                        : "Generate Full AI Report"}
                    </span>
                  </>
                )}
              </div>

              {!isAnalyzing && (
                <div className="relative mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-white/75">
                  <IconClock size={11} />
                  <span>
                    {landingMode ? "Sign up in 30 seconds" : "~2 min"}
                  </span>
                  <span className="text-white/40">·</span>
                  <span>
                    {landingMode
                      ? "No credit card required"
                      : "Multi-agent AI for enhanced accuracy"}
                  </span>
                </div>
              )}
            </button>

            {/* Trust indicators */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
              <IconShieldCheck size={12} />
              <span>Powered by GPT-5 + Google Solar API</span>
            </div>
          </div>
        </div>

        {/* ━━━ FOOTER ━━━ */}
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-center text-[10px] leading-relaxed text-gray-400">
            Instant estimates from Google Solar API. Full AI report uses
            multi-angle satellite imagery for improved accuracy.
          </p>
        </div>
      </div>

      {/* Shimmer animation keyframe */}
      <style jsx>{`
        @keyframes shimmerSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  )
}

// ━━━ SUB-COMPONENTS ━━━

function MetricCard({
  label,
  value,
  unit,
  icon
}: {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums tracking-tight text-gray-900">
          {value}
        </span>
        <span className="text-[11px] font-medium text-gray-400">{unit}</span>
      </div>
    </div>
  )
}

function QualityBadge({ quality }: { quality: string }) {
  const colors = qualityColor(quality)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors.bg} ${colors.text}`}
    >
      <span className={`inline-block size-1.5 rounded-full ${colors.dot}`} />
      {quality}
    </span>
  )
}

function MetricsSkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-gray-100 bg-white px-3.5 py-3"
          >
            <div className="mb-2 h-3 w-16 rounded bg-gray-100" />
            <div className="h-6 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="h-8 animate-pulse rounded-lg bg-gray-50" />
    </div>
  )
}

export default PropertyPreviewDrawer
