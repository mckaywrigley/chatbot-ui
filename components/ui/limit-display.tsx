import { FC } from "react"

interface LimitDisplayProps {
  used: number
  limit: number
}

export const LimitDisplay: FC<LimitDisplayProps> = ({ used, limit }) => {
  return (
    <div className="text-xs italic">
      {used}/{limit}
    </div>
  )
}
