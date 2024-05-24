import { useEffect, useState } from "react"
import SingletonAudioPlayer from "./singleton-audio-player"

export const useAudioPlayer = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const updateState = (loading: boolean, playing: boolean) => {
      setIsLoading(loading)
      setIsPlaying(playing)
    }

    SingletonAudioPlayer.subscribe(updateState)
    return () => {
      SingletonAudioPlayer.unsubscribe(updateState)
    }
  }, [])

  const playAudio = (messageContent: string) => {
    SingletonAudioPlayer.playAudio(messageContent)
  }

  const stopAudio = () => {
    SingletonAudioPlayer.stopAudio()
  }

  return {
    playAudio,
    stopAudio,
    isLoading,
    isPlaying
  }
}
