"use client"

import { useState, useRef, useEffect } from "react"
import {
  IconMicrophone,
  IconPlayerStop,
  IconLoader2
} from "@tabler/icons-react"

interface VoiceInputProps {
  onTranscript: (transcript: string) => void
  onParsedData?: (data: Record<string, any>) => void
  placeholder?: string
  parsePrompt?: string
}

export function VoiceInput({
  onTranscript,
  onParsedData,
  placeholder = "Click to speak...",
  parsePrompt
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ""
      let interimTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      const currentTranscript = finalTranscript || interimTranscript
      setTranscript(prev => prev + " " + currentTranscript)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error)
      setError(`Recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("")
      setError(null)
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stopListening = async () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)

      // If we have transcript and a parse function, parse it
      if (transcript.trim() && onParsedData && parsePrompt) {
        setIsParsing(true)
        try {
          const response = await fetch("/api/crm/parse-voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript: transcript.trim(),
              parsePrompt
            })
          })

          if (response.ok) {
            const data = await response.json()
            onParsedData(data.parsed)
          }
        } catch (err) {
          console.error("Failed to parse voice input:", err)
        } finally {
          setIsParsing(false)
        }
      }

      onTranscript(transcript.trim())
    }
  }

  if (error === "Speech recognition not supported in this browser") {
    return null // Don't show button if not supported
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={isParsing}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          isListening
            ? "bg-red-500 text-white hover:bg-red-600"
            : isParsing
              ? "bg-gray-200 text-gray-500"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
        }`}
      >
        {isParsing ? (
          <>
            <IconLoader2 size={18} className="animate-spin" />
            Processing...
          </>
        ) : isListening ? (
          <>
            <IconPlayerStop size={18} />
            Stop Recording
          </>
        ) : (
          <>
            <IconMicrophone size={18} />
            {placeholder}
          </>
        )}
      </button>

      {isListening && (
        <div className="flex items-center gap-2">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex size-3 rounded-full bg-red-500"></span>
          </span>
          <span className="text-sm text-gray-500">Listening...</span>
        </div>
      )}

      {transcript && !isListening && !isParsing && (
        <p className="max-w-xs truncate text-sm italic text-gray-500">
          &ldquo;{transcript.slice(0, 50)}...&rdquo;
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
