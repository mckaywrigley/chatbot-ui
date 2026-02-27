import { FC } from "react"

interface AvianSVGProps {
  height?: number
  width?: number
  className?: string
}

export const AvianSVG: FC<AvianSVGProps> = ({
  height = 40,
  width = 40,
  className
}) => {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
    >
      <path
        d="M12 2L3 20h4l1.5-3.5h7L17 20h4L12 2zm0 5.5L15 14H9l3-6.5z"
        fill="currentColor"
      />
    </svg>
  )
}
