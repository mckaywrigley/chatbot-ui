import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { useAlertContext } from "@/context/alert-context"

const useSpeechRecognition = (
  onTranscriptChange: (transcript: string) => void
) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isMicSupported, setIsMicSupported] = useState(true)
  const [hasMicAccess, setHasMicAccess] = useState(true)
  const [isSpeechToTextLoading, setIsSpeechToTextLoading] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [hasSupportedMimeType, setHasSupportedMimeType] = useState(false)
  const audioChunksRef = useRef<Blob[]>([])
  const isCanceledRef = useRef(false)
  const prevIsListeningRef = useRef(false)

  const isAppleDevice =
    /iPhone|iPad|iPod|Macintosh|MacIntel|MacPPC|Mac68K/i.test(
      navigator.userAgent
    )
  const { dispatch: alertDispatch } = useAlertContext()

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsMicSupported(false)
      return
    }

    const mimeType = getSupportedMimeType()
    setHasSupportedMimeType(!!mimeType)
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

    const audioBlob = new Blob(audioChunksRef.current, {
      type: mimeType
    })
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
        } else {
          throw new Error("Failed to transcribe audio")
        }
        return
      }

      setTranscript(data.text)
      onTranscriptChange(data.text)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`)
      } else {
        toast.error("An unknown error occurred")
      }
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

    // Always use audio/mp4 for Apple devices
    if (isAppleDevice) {
      return "audio/mp4"
    }

    return mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || null
  }, [])

  const startRecording = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const mimeType = isMobile ? "audio/mp4" : getSupportedMimeType()

        if (!mimeType) {
          toast.error("No supported audio MIME type found.")
          setIsListening(false)
          return
        }

        const options = { mimeType }
        const recorder = new MediaRecorder(stream, options)
        recorder.ondataavailable = handleDataAvailable
        recorder.onstop = handleStop
        recorder.start(1000)
        setMediaRecorder(recorder)
        setIsListening(true)
      })
      .catch(err => {
        toast.error("Microphone access denied: " + err)
        setHasMicAccess(false)
        setIsListening(false)
      })
  }, [handleDataAvailable, handleStop, getSupportedMimeType])

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
    startListening,
    cancelListening,
    isSpeechToTextLoading
  }
}

export default useSpeechRecognition
