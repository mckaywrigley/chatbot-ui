import React, { FC, useRef, useState } from "react"
import { IconX, IconCheck, IconPlayerRecord } from "@tabler/icons-react"

interface VoiceRecordingBarProps {
  isListening: boolean
  stopListening: () => void
  cancelListening: () => void
}

const VoiceRecordingBar: FC<VoiceRecordingBarProps> = ({
  isListening,
  stopListening,
  cancelListening
}) => {
  const [recordingTime, setRecordingTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const startRecording = () => {
    if (!isRecording) {
      setIsRecording(true)
      timerRef.current = setInterval(() => {
        setRecordingTime(prevRecordingTime => prevRecordingTime + 1)
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (isRecording) {
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const handleRecordingChange = (stop: boolean) => {
    stopRecording()
    stop ? stopListening() : cancelListening()
  }

  if (isListening && !isRecording) {
    startRecording()
  } else if (!isListening && isRecording) {
    stopRecording()
  }

  return (
    <div className="mt-3 flex min-h-[60px] items-center justify-between rounded-xl border-2 border-gray-300 bg-transparent px-4 py-2">
      <IconX
        className="bg-primary text-secondary cursor-pointer rounded text-gray-500 hover:text-gray-700"
        onClick={() => handleRecordingChange(false)}
        size={24}
      />
      <div className="flex-1">
        <div className="mx-2">
          {isRecording && (
            <div className="flex items-center justify-center">
              <IconPlayerRecord
                className="animate-ping text-red-500"
                size={18}
              />
              <span className="ml-2 text-sm text-gray-500">Recording...</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <div className="mr-2 text-sm text-gray-500">
          {formatTime(recordingTime)}
        </div>
        <IconCheck
          className="bg-primary text-secondary cursor-pointer rounded p-1 hover:opacity-50"
          onClick={() => handleRecordingChange(true)}
          size={28}
        />
      </div>
    </div>
  )
}

function formatTime(time: number): string {
  const minutes = Math.floor(time / 60).toString()
  const seconds = (time % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

export default VoiceRecordingBar
