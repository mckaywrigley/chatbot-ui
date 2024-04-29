import { FC } from "react"

interface LimitDisplayProps {
  used: number
  limit: number
}

export const LimitDisplay: FC<LimitDisplayProps> = ({ used, limit }) => {
  return (
    <div className="font-helvetica-now text-xs">
      {used}/{limit}
    </div>
  )
}
