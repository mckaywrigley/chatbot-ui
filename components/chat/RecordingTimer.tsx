/* eslint-disable react-hooks/exhaustive-deps */
// Timer.tsx
import React, { useState, useEffect } from "react"

interface TimerProps {
  isRunning: boolean
  handleSetTime: (time: number) => void
}

export const getMinutesAndSeconds = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const RecordingTimer: React.FC<TimerProps> = ({ isRunning, handleSetTime }) => {
  const [time, setTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1)
      }, 1000)
    } else {
      setTime(0)
      interval && clearInterval(interval)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isRunning])

  useEffect(() => {
    handleSetTime(time)
  }, [time])

  return (
    <div>
      {!isRunning ? (
        <p style={{ fontSize: 14 }}>Wait...</p>
      ) : (
        <div style={{ fontSize: 14, width: 29 }}>
          {getMinutesAndSeconds(time)}
        </div>
      )}
    </div>
  )
}

export default RecordingTimer
