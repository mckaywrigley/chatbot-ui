import { FC } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./tooltip"

interface WithTooltipProps {
  display: React.ReactNode
  trigger: React.ReactNode
  className?: string
  delayDuration?: number
  side?: "left" | "right" | "top" | "bottom"
}

export const WithTooltip: FC<WithTooltipProps> = ({
  display,
  trigger,
  className,
  delayDuration = 500,
  side = "right"
}) => {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger>{trigger}</TooltipTrigger>

        <TooltipContent className={className} side={side}>
          {display}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
