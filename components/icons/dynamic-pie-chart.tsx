import { FC } from "react"

interface ChatbotUISVGProps {
  value: number
  scale?: number
}

const DynamicPieChart: FC<ChatbotUISVGProps> = ({ value, scale = 1 }) => {
  const radius = 20 // Radius of the circle
  const circumference = 2 * Math.PI * radius // Circumference of the circle
  const filledPercentage = value // Percentage of the pie chart filled
  const dashOffset = ((100 - filledPercentage) / 100) * circumference // Calculating dash offset

  return (
    <svg width={50 * scale} height={50 * scale} viewBox="0 0 50 50">
      <circle
        cx="25"
        cy="25"
        r={radius}
        fill="none"
        stroke="#ccc"
        strokeWidth="10"
        transform="rotate(-90 25 25)"
      />
      <circle
        cx="25"
        cy="25"
        r={radius}
        fill="none"
        stroke="tomato"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 25 25)"
      />
    </svg>
  )
}

export default DynamicPieChart
