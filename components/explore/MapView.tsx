// components > explore > MapView.tsx

"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  IconSearch,
  IconMapPin,
  IconLoader2,
  IconBuildingSkyscraper,
  IconInfoCircle,
  IconRuler,
  Icon3dRotate,
  IconMap,
  IconCurrentLocation,
  IconSparkles
} from "@tabler/icons-react"
import { FeatureTabs } from "@/components/ui/feature-tabs"
import Script from "next/script"

// Interface for MapView props
interface MapViewProps {
  workspaceId: string
  selectedLocation: { lat: number; lng: number } | null
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void
  selectedAddress: string
  setSelectedAddress: (address: string) => void
  isAnalyzing: boolean
  captureProgress: number
  captureAngle: number
  is3DMode: boolean
  toggleIs3DMode: () => void
  isDebugMode: boolean
  logDebug: (message: string) => void
  measuredArea: string | null
  setMeasuredArea: (area: string | null) => void
  measuredDistance: string | null
  setMeasuredDistance: (distance: string | null) => void
  captureMapView: (
    containerRef: React.RefObject<HTMLDivElement>,
    viewName: string
  ) => Promise<{
    imageData: string
    viewName: string
    timestamp: string
  } | null>
  onAnalyzePropertyClick: () => void
  // New prop to expose the map container reference
  setMapContainerRef?: (el: HTMLDivElement | null) => void
  // Prop to expose the map reference
  setMapRef?: (map: google.maps.Map | null) => void
  // NEW: Add these props for image processing options
  imageProcessingOptions?: {
    enhanceEdges: boolean
    enhanceContrast: boolean
    addMeasurementGrid: boolean
    colorSegmentation?: boolean
    pitchEnhancement?: boolean
  }
  onToggleImageProcessingOption?: (option: string) => void
  // Model selector props
  selectedModel?: string
  onModelChange?: (model: string) => void
  availableModels?: Array<{ value: string; label: string; provider: string }>
  // Debug toggle
  onToggleDebugMode?: () => void
  // Sidebar state for layout adjustments
  showSidebar?: boolean
  // Live preview state
  livePreviewImages?: any[]
  currentCaptureStage?: string
  // Info window ref
  setInfoWindowRef?: (infoWindow: google.maps.InfoWindow | null) => void
  // Hide toggle when report is displayed
  hasActiveReport?: boolean
  // Preview drawer state for layout adjustments
  isPreviewDrawerOpen?: boolean
}

const MapView: React.FC<MapViewProps> = ({
  workspaceId,
  selectedLocation,
  setSelectedLocation,
  selectedAddress,
  setSelectedAddress,
  isAnalyzing,
  captureProgress,
  captureAngle,
  is3DMode,
  toggleIs3DMode,
  isDebugMode,
  logDebug,
  measuredArea,
  setMeasuredArea,
  measuredDistance,
  setMeasuredDistance,
  captureMapView,
  onAnalyzePropertyClick,
  setMapContainerRef,
  setMapRef,
  livePreviewImages = [],
  currentCaptureStage = "",
  setInfoWindowRef,
  selectedModel,
  onModelChange,
  availableModels,
  onToggleDebugMode,
  showSidebar = false,
  hasActiveReport = false,
  isPreviewDrawerOpen = false
}) => {
  const [isClient, setIsClient] = useState(false)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [loadAttempts, setLoadAttempts] = useState(0)
  const scriptLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [center, setCenter] = useState({ lat: 39.8283, lng: -98.5795 }) // Default to US center
  const [zoom, setZoom] = useState(4)
  const [isSearching, setIsSearching] = useState(false)
  const [showDrawingTools, setShowDrawingTools] = useState(false)
  const [heatmapVisible, setHeatmapVisible] = useState(false)
  const [searchInputValue, setSearchInputValue] = useState("") // Add state for search input value

  const mapRef = useRef<google.maps.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const autocompleteInputRef = useRef<HTMLInputElement | null>(null)
  // Separate ref for mobile input
  const autocompleteInputRefMobile = useRef<HTMLInputElement | null>(null)
  const autocompleteRefMobile = useRef<google.maps.places.Autocomplete | null>(
    null
  )
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(
    null
  )
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null)
  const activePolygonRef = useRef<google.maps.Polygon | null>(null)
  const activeRectangleRef = useRef<google.maps.Rectangle | null>(null)
  const measurementLabelRef = useRef<google.maps.Marker | null>(null)

  const { toast } = useToast()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLEMAPS_API_KEY || ""

  // Effect to update search input when selectedAddress changes
  useEffect(() => {
    if (selectedAddress) {
      if (autocompleteInputRef.current) {
        autocompleteInputRef.current.value = selectedAddress
      }
      if (autocompleteInputRefMobile.current) {
        autocompleteInputRefMobile.current.value = selectedAddress
      }
    }
  }, [selectedAddress])

  // Mark when we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Check if Google Maps is already loaded
  const checkGoogleMapsLoaded = useCallback(() => {
    return (
      typeof window !== "undefined" &&
      typeof window.google !== "undefined" &&
      typeof window.google.maps !== "undefined"
    )
  }, [])

  // Handle script loading success
  const handleScriptLoad = useCallback(() => {
    if (scriptLoadTimeoutRef.current) {
      clearTimeout(scriptLoadTimeoutRef.current)
      scriptLoadTimeoutRef.current = null
    }
    setScriptLoaded(true)
    setScriptError(null)
    setLoadAttempts(0)
  }, [])

  // Handle script loading error with retry
  const handleScriptError = useCallback(() => {
    console.error("Failed to load Google Maps script")

    // Try up to 3 times before giving up
    if (loadAttempts < 3) {
      setLoadAttempts(prev => prev + 1)

      // Remove existing script tag
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      )
      if (existingScript) {
        existingScript.remove()
      }

      // Force reload after a brief delay
      setTimeout(() => {
        setScriptLoaded(false)
        setScriptError(null)
      }, 1000)
    } else {
      setScriptError(
        "Failed to load map after multiple attempts. Please refresh the page."
      )
    }
  }, [loadAttempts])

  // Set up timeout detection for script loading
  useEffect(() => {
    if (isClient && !scriptLoaded && !scriptError) {
      // Check if Google Maps is already loaded
      if (checkGoogleMapsLoaded()) {
        handleScriptLoad()
        return
      }

      // Set a timeout to detect if script loading is stuck
      scriptLoadTimeoutRef.current = setTimeout(() => {
        if (!checkGoogleMapsLoaded() && !scriptLoaded) {
          console.error("Map loading timeout - attempting recovery")
          handleScriptError()
        }
      }, 10000) // 10 second timeout

      return () => {
        if (scriptLoadTimeoutRef.current) {
          clearTimeout(scriptLoadTimeoutRef.current)
        }
      }
    }
  }, [
    isClient,
    scriptLoaded,
    scriptError,
    checkGoogleMapsLoaded,
    handleScriptLoad,
    handleScriptError
  ])

  // Retry loading the map
  const handleRetry = useCallback(() => {
    setScriptError(null)
    setScriptLoaded(false)
    // Reload the page to retry script loading
    window.location.reload()
  }, [])

  // Get direction name based on angle
  const getDirectionName = (angle: number): string => {
    const directions = [
      "north",
      "northeast",
      "east",
      "southeast",
      "south",
      "southwest",
      "west",
      "northwest"
    ]
    return directions[Math.round(angle / 45) % 8]
  }

  // Calculate area of a polygon in square feet
  const calculatePolygonArea = (polygon: google.maps.Polygon): number => {
    const path = polygon.getPath()
    return window.google.maps.geometry.spherical.computeArea(path) * 10.7639 // Convert from sq meters to sq feet
  }

  // Calculate area of a rectangle in square feet
  const calculateRectangleArea = (rectangle: google.maps.Rectangle): number => {
    const bounds = rectangle.getBounds()
    if (!bounds) return 0

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()
    const se = new window.google.maps.LatLng(sw.lat(), ne.lng())

    const width = window.google.maps.geometry.spherical.computeDistanceBetween(
      sw,
      se
    )
    const height = window.google.maps.geometry.spherical.computeDistanceBetween(
      se,
      ne
    )

    return width * height * 10.7639 // Convert from sq meters to sq feet
  }

  // Generate solar potential heatmap data
  const generateHeatmapData = (center: { lat: number; lng: number }) => {
    const data = []
    // Generate points with higher concentration near the center
    for (let i = 0; i < 100; i++) {
      // Random offset with gaussian-like distribution (more points near center)
      const latOffset = (Math.random() - 0.5) * 0.01 * (Math.random() * 10)
      const lngOffset = (Math.random() - 0.5) * 0.01 * (Math.random() * 10)

      // Make some areas have higher solar potential (higher weight)
      let weight = Math.random() * 10

      // South-facing areas get higher solar potential
      if (latOffset < 0) {
        weight *= 1.5
      }

      data.push({
        location: new window.google.maps.LatLng(
          center.lat + latOffset,
          center.lng + lngOffset
        ),
        weight: weight
      })
    }
    return data
  }

  // Create or update measurement label
  const updateMeasurementLabel = (
    position: google.maps.LatLng,
    text: string
  ) => {
    if (measurementLabelRef.current) {
      measurementLabelRef.current.setPosition(position)
      // Update the label content
      if (measurementLabelRef.current.getLabel) {
        measurementLabelRef.current.setLabel({
          text: text,
          color: "#FFFFFF",
          fontWeight: "bold"
        })
      }
    } else {
      measurementLabelRef.current = new window.google.maps.Marker({
        position: position,
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 0
        },
        label: {
          text: text,
          color: "#FFFFFF",
          fontWeight: "bold"
        }
      })
    }
  }

  // Toggle drawing tools
  const toggleDrawingTools = useCallback(() => {
    if (!drawingManagerRef.current || !mapRef.current) return

    if (showDrawingTools) {
      drawingManagerRef.current.setMap(null)

      // Clear measurement labels when hiding tools
      if (measurementLabelRef.current) {
        measurementLabelRef.current.setMap(null)
        measurementLabelRef.current = null
      }
      setMeasuredArea(null)
      setMeasuredDistance(null)
      logDebug("Measurement tools deactivated")
    } else {
      drawingManagerRef.current.setMap(mapRef.current)
      logDebug("Measurement tools activated")

      toast({
        title: "Measurement Tools Activated",
        description:
          "Draw a shape to measure area in square feet, or a line to measure distance.",
        duration: 4000
      })
    }

    setShowDrawingTools(!showDrawingTools)
  }, [showDrawingTools, logDebug, toast, setMeasuredArea, setMeasuredDistance])

  // Handle search input change (keeping for compatibility but not needed for uncontrolled input)
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Don't update state - let Google Places Autocomplete handle the input
    // setSearchInputValue(e.target.value)
  }

  // Initialize the map once the script is loaded and the DOM is ready
  useEffect(() => {
    if (
      !isClient ||
      !scriptLoaded ||
      !mapContainerRef.current ||
      mapInitialized
    )
      return

    // Add additional safety check
    if (!checkGoogleMapsLoaded()) {
      console.error("Google Maps not loaded despite scriptLoaded being true")
      setScriptLoaded(false)
      handleScriptError()
      return
    }

    try {
      logDebug("Initializing Google Maps")

      // Initialize map
      const newMap = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom,
        mapTypeId: "hybrid",
        fullscreenControl: false,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: window.google.maps.ControlPosition.TOP_RIGHT
        },
        streetViewControl: true,
        rotateControl: true,
        scaleControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        // Default to bird's eye view (directly above, no tilt)
        tilt: 0,
        heading: 0,
        // Add this to show labels on satellite view
        styles: [
          {
            featureType: "all",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ]
      })

      mapRef.current = newMap

      // Share the map reference with the parent component
      if (setMapRef) {
        setMapRef(newMap)
      }

      // Initialize geocoder
      geocoderRef.current = new window.google.maps.Geocoder()

      // Initialize InfoWindow
      infoWindowRef.current = new window.google.maps.InfoWindow()

      // Initialize autocomplete if the input ref is available
      if (autocompleteInputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          autocompleteInputRef.current,
          {
            types: ["address"]
          }
        )

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace()
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()

            newMap.setCenter({ lat, lng })
            newMap.setZoom(19) // Zoom in closer for searched locations

            setCenter({ lat, lng })
            setSelectedLocation({ lat, lng })

            if (place.formatted_address) {
              setSelectedAddress(place.formatted_address)
              // Update the input directly for uncontrolled component
              if (autocompleteInputRef.current) {
                autocompleteInputRef.current.value = place.formatted_address
              }
              logDebug(`Selected address: ${place.formatted_address}`)
            }

            // Create or move marker
            if (markerRef.current) {
              markerRef.current.setPosition({ lat, lng })
            } else {
              const marker = new window.google.maps.Marker({
                position: { lat, lng },
                map: newMap,
                animation: window.google.maps.Animation.DROP,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#4285F4",
                  fillOpacity: 0.8,
                  strokeColor: "white",
                  strokeWeight: 2
                }
              })
              markerRef.current = marker

              // Add click listener to marker
              marker.addListener("click", () => {
                if (infoWindowRef.current) {
                  infoWindowRef.current.setContent(`
                    <div style="padding: 12px; min-width: 220px; max-width: 280px;">
                      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px;">
                        <div style="flex: 1; font-size: 13px; font-weight: 500; color: #1a1a1a; line-height: 1.3; padding-right: 8px;">${place.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</div>
                        <button onclick="document.querySelector('.gm-style-iw').parentElement.style.display='none'" style="flex-shrink: 0; width: 20px; height: 20px; border: none; background: #f3f4f6; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #6b7280; padding: 0; line-height: 1;">×</button>
                      </div>
                      <div style="font-size: 11px; color: #0066cc;">Click Analyze Property to start</div>
                    </div>
                  `)
                  infoWindowRef.current.open(newMap, marker)
                }
              })
            }

            // Update heatmap if visible
            if (heatmapRef.current && heatmapVisible) {
              const newData = generateHeatmapData({ lat, lng })
              heatmapRef.current.setData(newData)
            }
          }
        })

        autocompleteRef.current = autocomplete
      }

      // Initialize autocomplete for MOBILE input too
      if (autocompleteInputRefMobile.current) {
        const autocompleteMobile = new window.google.maps.places.Autocomplete(
          autocompleteInputRefMobile.current,
          {
            types: ["address"]
          }
        )

        autocompleteMobile.addListener("place_changed", () => {
          const place = autocompleteMobile.getPlace()
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()

            newMap.setCenter({ lat, lng })
            newMap.setZoom(19)

            setCenter({ lat, lng })
            setSelectedLocation({ lat, lng })

            if (place.formatted_address) {
              setSelectedAddress(place.formatted_address)
              // Update BOTH inputs
              if (autocompleteInputRef.current) {
                autocompleteInputRef.current.value = place.formatted_address
              }
              if (autocompleteInputRefMobile.current) {
                autocompleteInputRefMobile.current.value =
                  place.formatted_address
              }
              logDebug(`Selected address (mobile): ${place.formatted_address}`)
            }

            // Create or move marker (same logic as desktop)
            if (markerRef.current) {
              markerRef.current.setPosition({ lat, lng })
            } else {
              const marker = new window.google.maps.Marker({
                position: { lat, lng },
                map: newMap,
                animation: window.google.maps.Animation.DROP,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#4285F4",
                  fillOpacity: 0.8,
                  strokeColor: "white",
                  strokeWeight: 2
                }
              })
              markerRef.current = marker
            }

            // Update heatmap if visible
            if (heatmapRef.current && heatmapVisible) {
              const newData = generateHeatmapData({ lat, lng })
              heatmapRef.current.setData(newData)
            }
          }
        })

        autocompleteRefMobile.current = autocompleteMobile
      }

      // Add click listener to map
      newMap.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return

        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        logDebug(`Map clicked at ${lat.toFixed(6)}, ${lng.toFixed(6)}`)

        // Create or move marker
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng })
        } else {
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: newMap,
            animation: window.google.maps.Animation.DROP,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#4285F4",
              fillOpacity: 0.8,
              strokeColor: "white",
              strokeWeight: 2
            }
          })
          markerRef.current = marker

          // Add click listener to marker
          marker.addListener("click", () => {
            if (infoWindowRef.current) {
              infoWindowRef.current.setContent(`
                <div style="padding: 12px; min-width: 220px; max-width: 280px;">
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px;">
                    <div style="flex: 1; font-size: 13px; font-weight: 500; color: #1a1a1a; line-height: 1.3; padding-right: 8px;">${selectedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</div>
                    <button onclick="document.querySelector('.gm-style-iw').parentElement.style.display='none'" style="flex-shrink: 0; width: 20px; height: 20px; border: none; background: #f3f4f6; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #6b7280; padding: 0; line-height: 1;">×</button>
                  </div>
                  <div style="font-size: 11px; color: #0066cc;">Click Analyze Property to start</div>
                </div>
              `)
              infoWindowRef.current.open(newMap, marker)
            }
          })
        }

        // Temporarily set clicked location (will be updated with geocoded location)
        setSelectedLocation({ lat, lng })

        // Reverse geocode to find the actual building address and its centered coordinates
        if (geocoderRef.current) {
          geocoderRef.current.geocode(
            {
              location: { lat, lng }
            },
            (results, status) => {
              if (
                status === window.google.maps.GeocoderStatus.OK &&
                results &&
                results[0]
              ) {
                setSelectedAddress(results[0].formatted_address)

                // CRITICAL: Use the geocoded building coordinates (centered on property)
                // instead of the raw click coordinates
                if (results[0].geometry && results[0].geometry.location) {
                  const geocodedLat = results[0].geometry.location.lat()
                  const geocodedLng = results[0].geometry.location.lng()
                  setSelectedLocation({ lat: geocodedLat, lng: geocodedLng })
                  logDebug(
                    `Updated location to geocoded building center: ${geocodedLat.toFixed(6)}, ${geocodedLng.toFixed(6)}`
                  )

                  // Move marker to the geocoded (centered) position
                  if (markerRef.current) {
                    markerRef.current.setPosition({
                      lat: geocodedLat,
                      lng: geocodedLng
                    })
                  }
                }

                // Update both search inputs with the new address directly
                if (autocompleteInputRef.current) {
                  autocompleteInputRef.current.value =
                    results[0].formatted_address
                }
                if (autocompleteInputRefMobile.current) {
                  autocompleteInputRefMobile.current.value =
                    results[0].formatted_address
                }
                logDebug(`Reverse geocoded to: ${results[0].formatted_address}`)

                // Update info window content
                if (infoWindowRef.current && markerRef.current) {
                  infoWindowRef.current.setContent(`
                  <div style="padding: 12px; min-width: 220px; max-width: 280px;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px;">
                      <div style="flex: 1; font-size: 13px; font-weight: 500; color: #1a1a1a; line-height: 1.3; padding-right: 8px;">${results[0].formatted_address}</div>
                      <button onclick="document.querySelector('.gm-style-iw').parentElement.style.display='none'" style="flex-shrink: 0; width: 20px; height: 20px; border: none; background: #f3f4f6; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #6b7280; padding: 0; line-height: 1;">×</button>
                    </div>
                    <div style="font-size: 11px; color: #0066cc;">Click Analyze Property to start</div>
                  </div>
                `)
                  infoWindowRef.current.open(newMap, markerRef.current)
                }
              } else {
                setSelectedAddress("")
                // Clear search input when reverse geocoding fails
                if (autocompleteInputRef.current) {
                  autocompleteInputRef.current.value = ""
                }
                logDebug("Reverse geocoding failed")
              }
            }
          )
        }

        // Update heatmap if visible
        if (heatmapRef.current && heatmapVisible) {
          const newData = generateHeatmapData({ lat, lng })
          heatmapRef.current.setData(newData)
        }
      })

      // Initialize drawing tools
      if (window.google.maps.drawing) {
        const drawingManager = new window.google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: true,
          drawingControlOptions: {
            position: window.google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              window.google.maps.drawing.OverlayType.POLYGON,
              window.google.maps.drawing.OverlayType.RECTANGLE,
              window.google.maps.drawing.OverlayType.POLYLINE
            ]
          },
          polygonOptions: {
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4285F4",
            clickable: true,
            editable: true,
            zIndex: 1
          },
          rectangleOptions: {
            fillColor: "#4285F4",
            fillOpacity: 0.3,
            strokeWeight: 2,
            strokeColor: "#4285F4",
            clickable: true,
            editable: true,
            zIndex: 1
          },
          polylineOptions: {
            strokeColor: "#4285F4",
            strokeWeight: 3,
            strokeOpacity: 1,
            clickable: true,
            editable: true,
            zIndex: 1
          }
        })

        drawingManagerRef.current = drawingManager
        // Initially hide the drawing tools
        drawingManager.setMap(null)

        // Add event listener for when a shape is completed
        window.google.maps.event.addListener(
          drawingManager,
          "overlaycomplete",
          event => {
            // Switch back to non-drawing mode after drawing is complete
            drawingManager.setDrawingMode(null)

            if (event.type === window.google.maps.drawing.OverlayType.POLYGON) {
              // Clear any previous active polygon
              if (activePolygonRef.current) {
                activePolygonRef.current.setMap(null)
              }

              const polygon = event.overlay as google.maps.Polygon
              activePolygonRef.current = polygon

              // Calculate and display area
              const area = calculatePolygonArea(polygon)
              const areaFormatted = area.toLocaleString(undefined, {
                maximumFractionDigits: 1
              })
              setMeasuredArea(`Area: ${areaFormatted} sq ft`)

              // Get polygon center for label placement
              const bounds = new window.google.maps.LatLngBounds()
              polygon.getPath().forEach(latLng => {
                bounds.extend(latLng)
              })

              updateMeasurementLabel(
                bounds.getCenter(),
                `${areaFormatted} sq ft`
              )

              // Add event listeners for when polygon is edited
              window.google.maps.event.addListener(
                polygon.getPath(),
                "set_at",
                function () {
                  const newArea = calculatePolygonArea(polygon)
                  const newAreaFormatted = newArea.toLocaleString(undefined, {
                    maximumFractionDigits: 1
                  })
                  setMeasuredArea(`Area: ${newAreaFormatted} sq ft`)
                  updateMeasurementLabel(
                    bounds.getCenter(),
                    `${newAreaFormatted} sq ft`
                  )
                }
              )

              window.google.maps.event.addListener(
                polygon.getPath(),
                "insert_at",
                function () {
                  const newArea = calculatePolygonArea(polygon)
                  const newAreaFormatted = newArea.toLocaleString(undefined, {
                    maximumFractionDigits: 1
                  })
                  setMeasuredArea(`Area: ${newAreaFormatted} sq ft`)
                  updateMeasurementLabel(
                    bounds.getCenter(),
                    `${newAreaFormatted} sq ft`
                  )
                }
              )

              toast({
                title: "Area Measured",
                description: `The selected area is approximately ${areaFormatted} square feet.`,
                duration: 5000
              })
            } else if (
              event.type === window.google.maps.drawing.OverlayType.RECTANGLE
            ) {
              // Clear any previous active rectangle
              if (activeRectangleRef.current) {
                activeRectangleRef.current.setMap(null)
              }

              const rectangle = event.overlay as google.maps.Rectangle
              activeRectangleRef.current = rectangle

              // Calculate and display area
              const area = calculateRectangleArea(rectangle)
              const areaFormatted = area.toLocaleString(undefined, {
                maximumFractionDigits: 1
              })
              setMeasuredArea(`Area: ${areaFormatted} sq ft`)

              // Get rectangle center for label placement
              const bounds = rectangle.getBounds()
              if (bounds) {
                updateMeasurementLabel(
                  bounds.getCenter(),
                  `${areaFormatted} sq ft`
                )
              }

              // Add event listeners for when rectangle is edited
              window.google.maps.event.addListener(
                rectangle,
                "bounds_changed",
                function () {
                  const newArea = calculateRectangleArea(rectangle)
                  const newAreaFormatted = newArea.toLocaleString(undefined, {
                    maximumFractionDigits: 1
                  })
                  setMeasuredArea(`Area: ${newAreaFormatted} sq ft`)

                  const newBounds = rectangle.getBounds()
                  if (newBounds) {
                    updateMeasurementLabel(
                      newBounds.getCenter(),
                      `${newAreaFormatted} sq ft`
                    )
                  }
                }
              )

              toast({
                title: "Area Measured",
                description: `The selected area is approximately ${areaFormatted} square feet.`,
                duration: 5000
              })
            } else if (
              event.type === window.google.maps.drawing.OverlayType.POLYLINE
            ) {
              const polyline = event.overlay as google.maps.Polyline

              // Calculate length
              const path = polyline.getPath()
              let length = 0
              for (let i = 0; i < path.getLength() - 1; i++) {
                length +=
                  window.google.maps.geometry.spherical.computeDistanceBetween(
                    path.getAt(i),
                    path.getAt(i + 1)
                  )
              }

              // Convert meters to feet
              const lengthFeet = length * 3.28084
              const lengthFormatted = lengthFeet.toLocaleString(undefined, {
                maximumFractionDigits: 1
              })
              setMeasuredDistance(`Distance: ${lengthFormatted} ft`)

              // Place label at midpoint
              const midpointIndex = Math.floor(path.getLength() / 2)
              if (midpointIndex < path.getLength()) {
                updateMeasurementLabel(
                  path.getAt(midpointIndex),
                  `${lengthFormatted} ft`
                )
              }

              // Add event listeners for when polyline is edited
              window.google.maps.event.addListener(
                polyline.getPath(),
                "set_at",
                function () {
                  let newLength = 0
                  for (let i = 0; i < path.getLength() - 1; i++) {
                    newLength +=
                      window.google.maps.geometry.spherical.computeDistanceBetween(
                        path.getAt(i),
                        path.getAt(i + 1)
                      )
                  }

                  const newLengthFeet = newLength * 3.28084
                  const newLengthFormatted = newLengthFeet.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 1 }
                  )
                  setMeasuredDistance(`Distance: ${newLengthFormatted} ft`)

                  const midpointIndex = Math.floor(path.getLength() / 2)
                  if (midpointIndex < path.getLength()) {
                    updateMeasurementLabel(
                      path.getAt(midpointIndex),
                      `${newLengthFormatted} ft`
                    )
                  }
                }
              )

              window.google.maps.event.addListener(
                polyline.getPath(),
                "insert_at",
                function () {
                  let newLength = 0
                  for (let i = 0; i < path.getLength() - 1; i++) {
                    newLength +=
                      window.google.maps.geometry.spherical.computeDistanceBetween(
                        path.getAt(i),
                        path.getAt(i + 1)
                      )
                  }

                  const newLengthFeet = newLength * 3.28084
                  const newLengthFormatted = newLengthFeet.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 1 }
                  )
                  setMeasuredDistance(`Distance: ${newLengthFormatted} ft`)

                  const midpointIndex = Math.floor(path.getLength() / 2)
                  if (midpointIndex < path.getLength()) {
                    updateMeasurementLabel(
                      path.getAt(midpointIndex),
                      `${newLengthFormatted} ft`
                    )
                  }
                }
              )

              toast({
                title: "Distance Measured",
                description: `The measured distance is approximately ${lengthFormatted} feet.`,
                duration: 5000
              })
            }
          }
        )
      }

      // Initialize heatmap
      if (window.google.maps.visualization) {
        // Generate initial dummy data
        const heatmapData = generateHeatmapData(center)

        const heatmap = new window.google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: null, // Initially hide the heatmap
          radius: 20,
          opacity: 0.7,
          gradient: [
            "rgba(0, 255, 255, 0)",
            "rgba(0, 255, 255, 1)",
            "rgba(0, 191, 255, 1)",
            "rgba(0, 127, 255, 1)",
            "rgba(0, 63, 255, 1)",
            "rgba(0, 0, 255, 1)",
            "rgba(0, 0, 223, 1)",
            "rgba(0, 0, 191, 1)",
            "rgba(0, 0, 159, 1)",
            "rgba(0, 0, 127, 1)",
            "rgba(63, 0, 91, 1)",
            "rgba(127, 0, 63, 1)",
            "rgba(191, 0, 31, 1)",
            "rgba(255, 0, 0, 1)"
          ]
        })

        heatmapRef.current = heatmap
      }

      setMapInitialized(true)
      setMapLoaded(true)
      logDebug("Map initialization complete")
    } catch (error) {
      console.error("Error initializing map:", error)
      logDebug(`Map initialization error: ${error.message}`)
      toast({
        title: "Map Error",
        description:
          "There was a problem loading the map. Please refresh the page.",
        variant: "destructive"
      })
    }
  }, [
    isClient,
    scriptLoaded,
    center,
    zoom,
    toast,
    mapInitialized,
    heatmapVisible,
    logDebug,
    setSelectedLocation,
    setSelectedAddress,
    setMapRef
  ])

  // Initialize map with user's location
  useEffect(() => {
    if (!isClient || !mapLoaded || !mapRef.current) return

    setIsSearching(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setCenter(userLocation)
          mapRef.current?.setCenter(userLocation)
          mapRef.current?.setZoom(18)
          setZoom(18) // Zoom in when we have user location

          // Update heatmap data for this location
          if (heatmapRef.current && heatmapVisible) {
            const heatmapData = generateHeatmapData(userLocation)
            heatmapRef.current.setData(heatmapData)
          }

          setIsSearching(false)
        },
        () => {
          toast({
            title: "Location Access Denied",
            description:
              "Using default map view. You can search for a specific address.",
            variant: "destructive"
          })
          setIsSearching(false)
        }
      )
    } else {
      setIsSearching(false)
    }
  }, [isClient, mapLoaded, toast, heatmapVisible, setSelectedLocation])

  // Expose the map container ref to parent (only once when available)
  const [refSet, setRefSet] = useState(false)
  useEffect(() => {
    if (mapContainerRef.current && setMapContainerRef && !refSet) {
      setMapContainerRef(mapContainerRef.current)
      setRefSet(true)
    }
  }, [setMapContainerRef, refSet])

  // Simple fixed style for map container - this is important for proper display
  const mapContainerStyle = {
    width: "100%",
    height: "100%"
  }

  // Show error state only after all retries have been exhausted
  if (scriptError && loadAttempts >= 3) {
    return (
      <div className="explore-map-container h-full">
        <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="flex max-w-md flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
              <IconInfoCircle
                size={48}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Map Failed to Load
            </h3>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              {scriptError ||
                "The map could not be loaded after multiple attempts."}
            </p>
            <Button onClick={handleRetry} className="gap-2">
              <IconLoader2 size={16} />
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!isClient) {
    return (
      <div className="explore-map-container h-full">
        <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
            <IconLoader2 size={48} className="text-primary mb-2 animate-spin" />
            <div>Initializing map explorer...</div>
          </div>
        </div>
      </div>
    )
  }

  // Progress Indicator for capture process
  const ProgressIndicator = () => {
    if (!isAnalyzing) return null

    const message =
      currentCaptureStage ||
      (captureProgress < 10
        ? "Preparing capture..."
        : captureProgress < 90
          ? `Capturing view from ${getDirectionName(captureAngle)} (${Math.round(captureProgress)}%)`
          : "Analyzing with AI...")

    // Extract step number from message if it exists (e.g., "Step 1/4: Measurement Analysis")
    const stepMatch = message.match(/Step (\d)\/4: (.+)/)
    const currentStep = stepMatch ? parseInt(stepMatch[1]) : 0
    const stepName = stepMatch ? stepMatch[2] : null

    // Define the 4 analysis steps with descriptions and estimated times
    const analysisSteps = [
      {
        number: 1,
        name: "Measurement Specialist",
        shortName: "Measurements",
        description: "Calculating roof dimensions and facets",
        estimatedTime: "~30s"
      },
      {
        number: 2,
        name: "Condition Inspector",
        shortName: "Condition",
        description: "Analyzing material type and condition",
        estimatedTime: "~20s"
      },
      {
        number: 3,
        name: "Cost Estimator",
        shortName: "Costs",
        description: "Calculating material and labor costs",
        estimatedTime: "~20s"
      },
      {
        number: 4,
        name: "Quality Controller",
        shortName: "Validation",
        description: "Cross-referencing and validating data",
        estimatedTime: "~45s"
      }
    ]

    // Get current step details
    const currentStepDetails =
      currentStep > 0 ? analysisSteps[currentStep - 1] : null

    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col items-center space-y-6 overflow-y-auto rounded-2xl border border-gray-800 bg-gray-950/95 p-6 shadow-2xl md:space-y-8 md:p-10">
          {/* Animated Agent Avatar */}
          <div className="relative">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-teal-500/20"></div>
            <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/30">
              <svg
                className="size-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center">
            <div
              className="text-sm font-medium uppercase tracking-widest"
              style={{
                background:
                  "linear-gradient(90deg, #99F6E4 0%, #5EEAD4 25%, #14B8A6 50%, #5EEAD4 75%, #99F6E4 100%)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer 3s ease-in-out infinite"
              }}
            >
              Rooftops AI Agent
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {currentStep > 0 ? analysisSteps[currentStep - 1]?.name : message}
            </div>
            {currentStepDetails && (
              <div className="mt-2 text-sm text-gray-400">
                {currentStepDetails.description}
              </div>
            )}
          </div>

          <style jsx>{`
            @keyframes shimmer {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          `}</style>

          {/* Agent Progress Steps - Evenly Spaced */}
          {currentStep > 0 && (
            <div className="w-full px-4 md:px-8">
              <div className="flex items-start justify-evenly gap-4">
                {/* Step Circles */}
                {analysisSteps.map(step => {
                  const isComplete = step.number < currentStep
                  const isCurrent = step.number === currentStep
                  const isPending = step.number > currentStep

                  return (
                    <div
                      key={step.number}
                      className="flex flex-col items-center"
                    >
                      <div className="relative">
                        {/* Animated spinner ring for current step */}
                        {isCurrent && (
                          <div className="absolute -inset-2 animate-spin rounded-full border-2 border-transparent border-r-blue-500 border-t-blue-500"></div>
                        )}

                        <div
                          className={`flex size-14 items-center justify-center rounded-full border-2 text-lg font-semibold transition-all duration-300 ${
                            isComplete
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : isCurrent
                                ? "scale-110 border-blue-500 bg-blue-500 text-white shadow-xl shadow-blue-500/40"
                                : "border-gray-700 bg-gray-900 text-gray-600"
                          }`}
                        >
                          {isComplete ? "✓" : step.number}
                        </div>
                      </div>
                      <div
                        className={`mt-3 text-center text-xs font-medium transition-colors md:text-sm ${
                          isCurrent
                            ? "text-blue-400"
                            : isPending
                              ? "text-gray-600"
                              : "text-emerald-400"
                        }`}
                      >
                        {step.shortName}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Centered message for validation step */}
              {currentStep === 4 && (
                <div className="mt-4 space-y-2 text-center">
                  <div className="text-sm text-gray-400">
                    Finalizing your comprehensive roof report...
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <svg
                      className="size-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Please keep this tab open</span>
                  </div>
                </div>
              )}

              {/* Estimated time for current step */}
              {currentStepDetails && currentStep < 4 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span>Estimated: {currentStepDetails.estimatedTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Traditional Progress Bar (for capture phase before analysis) */}
          {currentStep === 0 && (
            <div className="w-full space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${captureProgress}%` }}
                ></div>
              </div>
              <div className="text-center text-sm text-gray-400">
                {Math.round(captureProgress)}% Complete
              </div>
            </div>
          )}

          {/* Live Preview Thumbnails */}
          {livePreviewImages.length > 0 && (
            <div className="w-full">
              <div className="mb-3 text-sm font-medium text-gray-400">
                Captured Views ({livePreviewImages.length}/6)
              </div>
              <div className="grid grid-cols-3 gap-3">
                {livePreviewImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-lg"
                  >
                    <img
                      src={img.imageData || img.url || img}
                      alt={img.viewName || `View ${idx + 1}`}
                      className="size-full object-cover transition-transform duration-200 group-hover:scale-110"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-center text-xs font-medium">
                      {img.viewName || `View ${idx + 1}`}
                    </div>
                  </div>
                ))}
                {/* Placeholder for remaining images */}
                {Array.from({ length: 6 - livePreviewImages.length }).map(
                  (_, idx) => (
                    <div
                      key={`placeholder-${idx}`}
                      className="aspect-square rounded-lg border border-dashed border-gray-700 bg-gray-900/50"
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Handler to get current location
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsSearching(true)
      navigator.geolocation.getCurrentPosition(
        position => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setCenter(userLocation)
          mapRef.current?.setCenter(userLocation)
          mapRef.current?.setZoom(18)
          setZoom(18)
          setSelectedLocation(userLocation)

          // Reverse geocode to get address
          if (geocoderRef.current) {
            geocoderRef.current.geocode(
              { location: userLocation },
              (results, status) => {
                if (
                  status === window.google.maps.GeocoderStatus.OK &&
                  results &&
                  results[0]
                ) {
                  setSelectedAddress(results[0].formatted_address)
                  // Update both search inputs directly
                  if (autocompleteInputRef.current) {
                    autocompleteInputRef.current.value =
                      results[0].formatted_address
                  }
                  if (autocompleteInputRefMobile.current) {
                    autocompleteInputRefMobile.current.value =
                      results[0].formatted_address
                  }
                  logDebug(`Current location: ${results[0].formatted_address}`)
                }
                setIsSearching(false)
              }
            )
          } else {
            setIsSearching(false)
          }

          // Update marker
          if (markerRef.current) {
            markerRef.current.setPosition(userLocation)
          } else if (mapRef.current) {
            const marker = new window.google.maps.Marker({
              position: userLocation,
              map: mapRef.current,
              animation: window.google.maps.Animation.DROP,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#4285F4",
                fillOpacity: 0.8,
                strokeColor: "white",
                strokeWeight: 2
              }
            })
            markerRef.current = marker
          }

          toast({
            title: "Location Found",
            description: "Map centered on your current location"
          })
        },
        error => {
          setIsSearching(false)
          toast({
            title: "Location Access Denied",
            description:
              "Please enable location permissions to use this feature.",
            variant: "destructive"
          })
        }
      )
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="size-full">
      {/* Load Google Maps script directly with Next.js Script component */}
      <Script
        id="google-maps-script"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing,visualization,geometry`}
        onLoad={handleScriptLoad}
        onError={handleScriptError}
        onReady={handleScriptLoad}
        strategy="lazyOnload"
      />

      <div className="flex h-full flex-col">
        {/* Desktop: Search at Top (hidden - now using bottom controls for all) */}
        <div className="mb-3 hidden flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:gap-4">
            <div className="relative grow">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <IconSearch className="size-5 text-gray-400" />
              </div>
              <Input
                ref={autocompleteInputRef}
                type="text"
                placeholder="Search for an address"
                className="w-full border-gray-200 bg-white py-2 pl-10 pr-4 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                defaultValue={searchInputValue}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onAnalyzePropertyClick}
                disabled={!selectedLocation || isAnalyzing}
                className="min-w-[220px] rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                {isAnalyzing ? (
                  <span className="flex items-center justify-center">
                    <IconLoader2 size={18} className="mr-2 animate-spin" />
                    Generating Report...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <IconBuildingSkyscraper size={18} className="mr-2" />
                    Generate Full Report
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Desktop tools */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDrawingTools}
              className={`px-2 text-xs ${showDrawingTools ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"} border-gray-200 dark:border-gray-700`}
            >
              <IconRuler size={14} className="mr-1" />
              {showDrawingTools ? "Hide Measurement Tools" : "Drawing Tools"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrentLocation}
              disabled={isSearching}
              className="border-gray-200 px-2 text-xs dark:border-gray-700"
            >
              <IconCurrentLocation size={14} className="mr-1" />
              Current Location
            </Button>
          </div>

          {/* Desktop measurements info */}
          {(selectedLocation || measuredArea || measuredDistance) && (
            <div className="text-sm">
              {selectedLocation && (
                <div className="mb-1">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    Selected Location:{" "}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedAddress ||
                      `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
                  </span>
                </div>
              )}

              {measuredArea && (
                <div className="mb-1">
                  <span className="font-medium text-green-600 dark:text-green-400">
                    <IconBuildingSkyscraper size={14} className="mr-1 inline" />
                    {measuredArea}
                  </span>
                </div>
              )}

              {measuredDistance && (
                <div>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">
                    <IconRuler size={14} className="mr-1 inline" />
                    {measuredDistance}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1">
          {isSearching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-60">
              <div className="flex items-center space-x-3 rounded-lg bg-gray-800 p-4 text-white">
                <IconLoader2 size={24} className="animate-spin text-blue-400" />
                <span>Locating you...</span>
              </div>
            </div>
          )}

          {(!scriptLoaded || !mapInitialized) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-800">
              <div className="flex flex-col items-center text-white">
                <IconLoader2
                  size={36}
                  className="mb-3 animate-spin text-blue-400"
                />
                <div>Loading map...</div>
                {loadAttempts > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    Retry attempt {loadAttempts}/3
                  </div>
                )}
              </div>
            </div>
          )}

          <ProgressIndicator />

          {/* The actual map container - uses absolute positioning */}
          <div
            ref={el => {
              mapContainerRef.current = el
              // Also call the parent's setter if provided
              if (el && setMapContainerRef) {
                setMapContainerRef(el)
              }
            }}
            style={mapContainerStyle}
            className="absolute inset-0 bg-gray-200 dark:bg-gray-800"
          ></div>
        </div>

        {/* Floating Control Panel at Bottom - Like chat input */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 p-4 transition-all duration-300${isPreviewDrawerOpen ? "sm:right-[420px]" : ""}`}
        >
          <div className="mx-auto max-w-4xl">
            {/* Navigation Tabs */}
            <FeatureTabs activeTab="report" className="pl-2 sm:pl-4" />

            {/* Floating Container with gradient border */}
            <div className="gradient-border relative z-0 rounded-2xl p-[1px] shadow-2xl">
              <div className="rounded-[15px] bg-white p-4 dark:bg-gray-800">
                {/* Search Input Row */}
                <div className="mb-3 flex items-center gap-3">
                  {/* Address Search Input */}
                  <div className="relative grow">
                    <Input
                      ref={autocompleteInputRefMobile}
                      type="text"
                      placeholder="Search Address"
                      className="h-12 w-full rounded-xl border-gray-300 bg-gray-50 pr-12 text-base focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      defaultValue={searchInputValue}
                    />
                  </div>

                  {/* Current Location Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCurrentLocation}
                    disabled={isSearching}
                    className="size-12 shrink-0 rounded-xl border-gray-300 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-600 dark:hover:bg-blue-900/20"
                    title="Use current location"
                  >
                    {isSearching ? (
                      <IconLoader2 size={20} className="animate-spin" />
                    ) : (
                      <IconCurrentLocation size={20} />
                    )}
                  </Button>

                  {/* Measure Button - Icon Only, Desktop Only */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleDrawingTools}
                    className={`hidden size-12 shrink-0 rounded-xl border-gray-300 hover:border-blue-500 hover:bg-blue-50 md:flex dark:border-gray-600 dark:hover:bg-blue-900/20 ${showDrawingTools ? "ring-2 ring-blue-500" : ""}`}
                    title="Measure tools"
                  >
                    <IconRuler size={20} />
                  </Button>
                </div>

                {/* Generate Report Button - Full Width */}
                <Button
                  onClick={onAnalyzePropertyClick}
                  disabled={!selectedLocation || isAnalyzing}
                  className="mb-3 h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-base font-semibold text-white hover:from-emerald-600 hover:to-cyan-600"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center">
                      <IconLoader2 size={20} className="mr-2 animate-spin" />
                      Generating Report...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <IconBuildingSkyscraper size={20} className="mr-2" />
                      Generate Full Report
                    </span>
                  )}
                </Button>

                {/* Bottom Row - AI Model Badge, Debug, and Tools (Smaller) - Desktop Only */}
                <div className="hidden items-center gap-2 overflow-x-auto md:flex">
                  {/* Rooftops Agent Badge (Read-only) */}
                  <div className="flex h-8 items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <IconSparkles size={14} />
                    <span>Rooftops Agent: On</span>
                  </div>

                  {/* Debug Button as Pill */}
                  {onToggleDebugMode && (
                    <Button
                      variant="outline"
                      onClick={onToggleDebugMode}
                      className={`h-8 rounded-full border border-gray-300 bg-gray-50 px-3 text-xs dark:border-gray-600 dark:bg-gray-700 ${isDebugMode ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <IconInfoCircle size={14} className="mr-1" />
                      Debug
                    </Button>
                  )}

                  {measuredArea && (
                    <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                      {measuredArea}
                    </span>
                  )}

                  {measuredDistance && (
                    <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                      {measuredDistance}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapView
