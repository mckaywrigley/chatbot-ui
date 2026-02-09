"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Script from "next/script"
import {
  IconSearch,
  IconCurrentLocation,
  IconLoader2,
  IconChevronDown,
  IconStar,
  IconLock,
  IconHome,
  IconMessageCircle,
  IconFileAnalytics
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"

interface LandingHeroMapProps {
  onPropertySelect: (
    location: { lat: number; lng: number },
    address: string
  ) => void
  isDrawerOpen: boolean
}

const LandingHeroMap: React.FC<LandingHeroMapProps> = ({
  onPropertySelect,
  isDrawerOpen
}) => {
  const router = useRouter()
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [scriptFailed, setScriptFailed] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState("")

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const autocompleteInputRef = useRef<HTMLInputElement>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLEMAPS_API_KEY || ""

  const handleScriptLoad = useCallback(() => {
    if (window.google?.maps) {
      setScriptLoaded(true)
    }
  }, [])

  // Check if Google Maps is already loaded (e.g. from a cached script)
  // Also set a timeout fallback if the script never loads
  useEffect(() => {
    if (window.google?.maps) {
      setScriptLoaded(true)
      return
    }
    const timeout = setTimeout(() => {
      if (!window.google?.maps) {
        setScriptFailed(true)
      }
    }, 12000)
    return () => clearTimeout(timeout)
  }, [])

  // Initialize map
  useEffect(() => {
    if (!scriptLoaded || !mapContainerRef.current || mapInitialized) return
    if (!window.google?.maps) return

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 32.83657, lng: -96.79327 },
      zoom: 19,
      mapTypeId: "hybrid",
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      rotateControl: false,
      scaleControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      tilt: 0,
      heading: 0,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        },
        {
          featureType: "transit",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    })

    mapRef.current = map
    geocoderRef.current = new window.google.maps.Geocoder()
    infoWindowRef.current = new window.google.maps.InfoWindow()

    // Autocomplete on search input
    if (autocompleteInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        { types: ["address"] }
      )

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace()
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()

          map.setCenter({ lat, lng })
          map.setZoom(19)

          if (place.formatted_address) {
            setSelectedAddress(place.formatted_address)
            if (autocompleteInputRef.current) {
              autocompleteInputRef.current.value = place.formatted_address
            }
          }

          placeMarker(map, { lat, lng }, place.formatted_address || "")
          onPropertySelect({ lat, lng }, place.formatted_address || "")
        }
      })
    }

    // No click listener on landing page — only address search triggers preview
    // This prevents accidental taps from burning the free preview

    setMapInitialized(true)
  }, [scriptLoaded, mapInitialized, onPropertySelect])

  // Helper: place/move marker
  const placeMarker = (
    map: google.maps.Map,
    position: { lat: number; lng: number },
    address?: string
  ) => {
    if (markerRef.current) {
      markerRef.current.setPosition(position)
    } else {
      const marker = new window.google.maps.Marker({
        position,
        map,
        animation: window.google.maps.Animation.DROP,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#03A7FF",
          fillOpacity: 0.9,
          strokeColor: "white",
          strokeWeight: 2.5
        }
      })
      markerRef.current = marker
    }

    map.setCenter(position)
    if (map.getZoom()! < 17) {
      map.setZoom(19)
    }
  }

  // Current location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return
    setIsLocating(true)

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng })
          mapRef.current.setZoom(19)
          placeMarker(mapRef.current, { lat, lng })
        }

        // Reverse geocode to populate search bar — but do NOT auto-select
        // The user still needs to search or pick an address to trigger the preview
        if (geocoderRef.current) {
          geocoderRef.current.geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (
                status === window.google.maps.GeocoderStatus.OK &&
                results?.[0]
              ) {
                const address = results[0].formatted_address
                setSelectedAddress(address)
                if (autocompleteInputRef.current) {
                  autocompleteInputRef.current.value = address
                }
              }
              setIsLocating(false)
            }
          )
        } else {
          setIsLocating(false)
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="relative size-full">
      {/* Google Maps Script */}
      <Script
        id="google-maps-landing"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`}
        onLoad={handleScriptLoad}
        onReady={handleScriptLoad}
        strategy="afterInteractive"
      />

      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 bg-gray-800" />

      {/* Loading / fallback overlay before map loads */}
      {!mapInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {scriptFailed ? (
            <div className="flex flex-col items-center gap-4 px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
                <IconHome className="size-8 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                Instant Roof Reports
              </h2>
              <p className="max-w-sm text-sm text-white/60">
                Search any address to get satellite roof measurements, pitch
                analysis, and cost estimates in seconds.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <IconLoader2 className="size-8 animate-spin text-cyan-400" />
              <span className="text-sm font-medium text-white/70">
                Loading map...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Floating Control Panel — centered vertically */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-all duration-300 ${
          isDrawerOpen ? "sm:right-[420px]" : ""
        }`}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-sm px-4 sm:max-w-lg sm:px-6">
          {/* Scarcity hint */}
          <div className="mb-2.5 flex items-center justify-center gap-1.5 sm:mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:text-sm">
              <IconLock size={14} className="text-emerald-400" />1 free report —
              no signup needed
            </span>
          </div>

          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => router.push("/login")}
              className="flex flex-1 items-center justify-center gap-2 rounded-t-xl bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-500 backdrop-blur-sm transition-colors hover:bg-white/90 hover:text-gray-700 sm:flex-none sm:px-6"
            >
              <IconMessageCircle size={16} />
              <span>Rooftops Chat</span>
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-t-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 sm:flex-none sm:px-6">
              <IconFileAnalytics size={16} />
              <span>Instant Report</span>
            </button>
          </div>

          {/* Input Container */}
          <div className="gradient-border relative z-0 rounded-2xl rounded-tl-none p-[1px] shadow-2xl">
            <div className="rounded-[15px] rounded-tl-none bg-white p-4">
              {/* Search Input Row */}
              <div className="flex items-center gap-2.5">
                <div className="relative grow">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <IconSearch className="size-[18px] text-gray-400" />
                  </div>
                  <input
                    ref={autocompleteInputRef}
                    type="text"
                    placeholder="Try it — enter any address"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 text-[15px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:h-12 sm:text-base"
                  />
                </div>

                {/* Current Location Button */}
                <button
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-600 sm:size-12"
                  title="Use current location"
                >
                  {isLocating ? (
                    <IconLoader2 size={18} className="animate-spin" />
                  ) : (
                    <IconCurrentLocation size={18} />
                  )}
                </button>
              </div>

              {/* CTA Button — focuses input on click */}
              <button
                onClick={() => autocompleteInputRef.current?.focus()}
                className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-[13px] font-semibold text-white shadow-lg transition-all hover:from-emerald-600 hover:to-cyan-600 hover:shadow-xl sm:mt-3 sm:h-12 sm:text-base"
              >
                Get Free Roof Report
              </button>

              {/* Social proof — inline below CTA */}
              <div className="mt-2.5 flex items-center justify-center gap-3 text-xs text-gray-400 sm:mt-3 sm:text-sm">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <IconStar
                        key={i}
                        size={12}
                        className="fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <span className="font-medium text-gray-500">4.9</span>
                </div>
                <span className="text-gray-300">·</span>
                <span className="font-medium text-gray-500">
                  2,000+ roofers
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll down indicator arrow */}
      <button
        onClick={() => {
          const belowFold = document.getElementById("below-fold")
          if (belowFold) belowFold.scrollIntoView({ behavior: "smooth" })
        }}
        className="absolute inset-x-0 bottom-6 z-20 mx-auto flex w-fit animate-bounce flex-col items-center gap-1.5 rounded-full bg-black/40 px-6 py-3 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 sm:bottom-4"
        aria-label="Scroll down to learn more"
      >
        <span className="text-xs font-medium tracking-wide sm:text-[11px]">
          Learn More
        </span>
        <IconChevronDown size={20} />
      </button>
    </div>
  )
}

export default LandingHeroMap
