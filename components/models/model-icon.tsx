import { cn } from "@/lib/utils"
import { LLMID, ModelProvider } from "@/types"
import { IconSparkles } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { FC, HTMLAttributes } from "react"
import { OpenAISVG } from "../icons/openai-svg"
// import Image from "next/image"
// import mistral from "@/public/providers/mistral.png"
import { HackerAISVG } from "../icons/hackerai-svg"

interface ModelIconProps extends HTMLAttributes<HTMLDivElement> {
  provider: ModelProvider
  modelId: LLMID | "custom"
  height: number
  width: number
}

export const ModelIcon: FC<ModelIconProps> = ({
  provider,
  modelId,
  height,
  width,
  ...props
}) => {
  const { theme } = useTheme()

  switch (modelId as LLMID) {
    case "gpt-4-turbo-preview":
      return (
        <OpenAISVG
          className={cn(
            "rounded-sm bg-[#fff] p-1 text-black",
            props.className,
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          width={width}
          height={height}
        />
      )
    case "mistral-medium":
      return (
        <HackerAISVG
          className={cn(
            "rounded-sm bg-[#fff] p-0.5 text-black",
            props.className,
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          width={width}
          height={height}
        />
      )
    case "mistral-large":
      return (
        <HackerAISVG
          className={cn(
            "rounded-sm  bg-[#fff] p-0.5 text-black",
            props.className,
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          width={width}
          height={height}
          fill="#ff0000"
        />
      )
    default:
      return <IconSparkles size={width} />
  }
}
