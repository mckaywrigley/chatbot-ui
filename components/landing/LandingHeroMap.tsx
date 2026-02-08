"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Script from "next/script"
import {
  IconSearch,
  IconCurrentLocation,
  IconLoader2,
  IconMessageCircle,
  IconHome,
  IconMapPin
} from "@tabler/icons-react"

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
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
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

  // Initialize map
  useEffect(() => {
    if (!scriptLoaded || !mapContainerRef.current || mapInitialized) return
    if (!window.google?.maps) return

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 5,
      mapTypeId: "hybrid",
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      rotateControl: false,
      scaleControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      },
      tilt: 0,
      heading: 0,
      styles: [
        {
          featureType: "all",
          elementType: "labels",
          stylers: [{ visibility: "on" }]
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

    // Click listener for map
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return

      const lat = e.latLng.lat()
      const lng = e.latLng.lng()

      placeMarker(map, { lat, lng })

      // Reverse geocode
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

              // Snap to geocoded building center
              if (results[0].geometry?.location) {
                const gLat = results[0].geometry.location.lat()
                const gLng = results[0].geometry.location.lng()
                if (markerRef.current) {
                  markerRef.current.setPosition({ lat: gLat, lng: gLng })
                }
                if (autocompleteInputRef.current) {
                  autocompleteInputRef.current.value = address
                }
                onPropertySelect({ lat: gLat, lng: gLng }, address)
              }
            }
          }
        )
      }
    })

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

        // Reverse geocode
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
                onPropertySelect({ lat, lng }, address)
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
        strategy="lazyOnload"
      />

      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 bg-gray-800" />

      {/* Loading overlay before map loads */}
      {!mapInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-3">
            <IconLoader2 className="size-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium text-white/70">
              Loading map...
            </span>
          </div>
        </div>
      )}

      {/* Floating Control Panel at Bottom */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 p-3 transition-all duration-300 sm:p-4 ${
          isDrawerOpen ? "sm:right-[420px]" : ""
        }`}
      >
        <div className="mx-auto max-w-3xl">
          {/* Feature Tabs */}
          <div className="relative z-10 -mb-[1px] flex items-end gap-0 pl-2 sm:pl-4">
            {/* Report Tab (active) */}
            <div className="z-20 rounded-t-xl bg-[#4FEBBC] p-[1px] pb-0">
              <button className="flex size-full items-center gap-1.5 whitespace-nowrap rounded-t-[11px] border-b border-white bg-white px-3 py-2 text-sm font-medium text-gray-900 sm:gap-2 sm:px-4 sm:py-2.5">
                <IconHome className="size-4" />
                <span>Instant Roof Report</span>
              </button>
            </div>

            {/* Chat Tab (redirects to login) */}
            <div className="ml-[-1px] mb-[1px] rounded-t-xl py-[1px]">
              <a
                href="/login"
                className="flex size-full items-center gap-1.5 whitespace-nowrap rounded-t-[11px] border border-transparent bg-gray-200/80 px-3 py-2 text-sm font-medium text-gray-600 backdrop-blur-sm transition-colors hover:bg-gray-300 hover:text-gray-900 sm:gap-2 sm:px-4 sm:py-2.5"
              >
                <IconMessageCircle className="size-4" />
                <span>Rooftops Chat</span>
              </a>
            </div>
          </div>

          {/* Input Container */}
          <div className="gradient-border relative z-0 rounded-2xl p-[1px] shadow-2xl">
            <div className="rounded-[15px] bg-white p-3 sm:p-4">
              {/* Search Input Row */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative grow">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <IconSearch className="size-4 text-gray-400 sm:size-5" />
                  </div>
                  <input
                    ref={autocompleteInputRef}
                    type="text"
                    placeholder="Search any address to see instant roof data..."
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 sm:h-12 sm:text-base"
                  />
                </div>

                {/* Current Location Button */}
                <button
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-600 sm:size-12"
                  title="Use current location"
                >
                  {isLocating ? (
                    <IconLoader2 size={20} className="animate-spin" />
                  ) : (
                    <IconCurrentLocation size={20} />
                  )}
                </button>
              </div>

              {/* CTA Button */}
              <a
                href="/login"
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-sm font-semibold text-white shadow-lg transition-all hover:from-emerald-600 hover:to-cyan-600 hover:shadow-xl sm:h-12 sm:text-base"
              >
                <IconMapPin size={18} />
                Try It Free — No Credit Card Required
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingHeroMap
