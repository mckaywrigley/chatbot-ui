import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { useAlertContext } from "@/context/alert-context"

const useSpeechRecognition = (
  onTranscriptChange: (transcript: string) => void
) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isMicSupported, setIsMicSupported] = useState(true)
  const [hasMicAccess, setHasMicAccess] = useState(false)
  const [isRequestingMicAccess, setIsRequestingMicAccess] = useState(false)
  const [isSpeechToTextLoading, setIsSpeechToTextLoading] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [hasSupportedMimeType, setHasSupportedMimeType] = useState(false)

  const audioChunksRef = useRef<Blob[]>([])
  const isCanceledRef = useRef(false)
  const prevIsListeningRef = useRef(false)

  const { dispatch: alertDispatch } = useAlertContext()

  const isAppleDevice =
    /iPhone|iPad|iPod|Macintosh|MacIntel|MacPPC|Mac68K/i.test(
      navigator.userAgent
    )

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsMicSupported(false)
      return
    }

    const mimeType = getSupportedMimeType()
    setHasSupportedMimeType(!!mimeType)
  }, [])

  const requestMicAccess = useCallback(() => {
    setIsRequestingMicAccess(true)
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        setHasMicAccess(true)
        setIsListening(true)
      })
      .catch(() => {
        setHasMicAccess(false)
        setIsMicSupported(false)
      })
      .finally(() => {
        setIsRequestingMicAccess(false)
      })
  }, [])

  const handleDataAvailable = useCallback((event: BlobEvent) => {
    if (event.data.size > 0) {
      audioChunksRef.current.push(event.data)
    }
  }, [])

  const handleStop = useCallback(async () => {
    if (isCanceledRef.current) {
      audioChunksRef.current = []
      isCanceledRef.current = false
      return
    }

    const mimeType = isAppleDevice
      ? "audio/mp4"
      : mediaRecorder?.mimeType || "audio/webm"
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
    const fileSizeInMB = audioBlob.size / (1024 * 1024)

    if (audioBlob.size === 0) {
      toast.error("Audio file size is 0. Please try recording again.")
      audioChunksRef.current = []
      return
    }

    if (fileSizeInMB > 24) {
      toast.error("Audio file size exceeds the maximum allowed size of 24 MB.")
      audioChunksRef.current = []
      return
    }

    const formData = new FormData()
    formData.append(
      "audioFile",
      audioBlob,
      `speech.${audioBlob.type.split("/")[1]}`
    )

    try {
      setIsSpeechToTextLoading(true)
      const response = await fetch("/api/v2/chat/speech-to-text", {
        method: "POST",
        body: formData
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429 && data && data.timeRemaining) {
          alertDispatch({
            type: "SHOW",
            payload: { message: data.message, title: "Usage Cap Error" }
          })
        } else if (data.error && data.error.code === "audio_too_short") {
          toast.error(
            "Audio file is too short. Minimum audio length is 0.1 seconds."
          )
        } else {
          throw new Error("Failed to transcribe audio")
        }
        return
      }

      setTranscript(data.text)
      onTranscriptChange(data.text)
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : "An unknown error occurred"}`
      )
    } finally {
      setIsSpeechToTextLoading(false)
      audioChunksRef.current = []
    }
  }, [mediaRecorder, onTranscriptChange, alertDispatch])

  const getSupportedMimeType = useCallback((): string | null => {
    const mimeTypes = [
      "audio/flac",
      "audio/m4a",
      "audio/mp3",
      "audio/mp4",
      "audio/mpeg",
      "audio/mpga",
      "audio/oga",
      "audio/ogg",
      "audio/wav",
      "audio/webm"
    ]

    if (isAppleDevice) {
      return "audio/mp4"
    }

    return mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || null
  }, [])

  const startRecording = useCallback(() => {
    if (!hasMicAccess) {
      toast.error("Microphone access is required to start recording.")
      return
    }

    setTranscript("")

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        const mimeType = getSupportedMimeType()

        if (!mimeType) {
          toast.error("No supported audio MIME type found.")
          setIsListening(false)
          return
        }

        const recorder = new MediaRecorder(stream, { mimeType })
        recorder.ondataavailable = handleDataAvailable
        recorder.onstop = handleStop
        recorder.start(1000)
        setMediaRecorder(recorder)
        setIsListening(true)
      })
      .catch(err => {
        toast.error(`Microphone access denied: ${err}`)
        setHasMicAccess(false)
        setIsListening(false)
      })
  }, [handleDataAvailable, handleStop, getSupportedMimeType, hasMicAccess])

  useEffect(() => {
    if (isListening && !prevIsListeningRef.current) {
      startRecording()
    } else if (!isListening && mediaRecorder) {
      mediaRecorder.stop()
    }

    prevIsListeningRef.current = isListening

    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
      }
    }
  }, [isListening, startRecording, mediaRecorder])

  const startListening = () => {
    setIsListening(true)
  }

  const cancelListening = () => {
    isCanceledRef.current = true
    setIsListening(false)
  }

  return {
    isListening,
    transcript,
    setIsListening,
    isMicSupported,
    hasSupportedMimeType,
    hasMicAccess,
    isRequestingMicAccess,
    requestMicAccess,
    startListening,
    cancelListening,
    isSpeechToTextLoading
  }
}

export default useSpeechRecognition
