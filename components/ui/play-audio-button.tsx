import { faVolume } from "@fortawesome/pro-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { FC } from "react"
import AudioSpinner from "./audio-spinner"

interface PlayAudioButtonProps {
  isProcessing: boolean
}

export const PlayAudioButton: FC<PlayAudioButtonProps> = ({ isProcessing }) => {
  if (isProcessing) {
    return <AudioSpinner />
  }

  return <FontAwesomeIcon className="text-pixelspace-gray-40" icon={faVolume} />
}
