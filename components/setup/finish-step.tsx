import { FC } from "react"

interface FinishStepProps {
  displayName: string
}

export const FinishStep: FC<FinishStepProps> = ({ displayName }) => {
  return (
    <div className="space-y-4">
      <div>Welcome to Chatbot UI, {displayName.split(" ")[0]}!</div>

      <div>Click next to start chatting.</div>
    </div>
  )
}
