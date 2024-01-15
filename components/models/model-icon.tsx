import { cn } from "@/lib/utils"
import meta from "@/public/providers/meta.png"
import mistral from "@/public/providers/mistral.png"
import perplexity from "@/public/providers/perplexity.png"
import { LLMID } from "@/types"
import { IconSparkles } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { FC, HTMLAttributes } from "react"
import { AnthropicSVG } from "../icons/anthropic-svg"
import { GoogleSVG } from "../icons/google-svg"
import { OpenAISVG } from "../icons/openai-svg"

interface ModelIconProps extends HTMLAttributes<HTMLDivElement> {
  modelId: LLMID | string
  height: number
  width: number
}

export const ModelIcon: FC<ModelIconProps> = ({
  modelId,
  height,
  width,
  ...props
}) => {
  const { theme } = useTheme()

  switch (modelId as string) {
    case "gpt-4-1106-preview":
    case "gpt-4-vision-preview":
    case "gpt-3.5-turbo-1106":
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
    case "llama2-7b":
    case "llama2-70b":
      return (
        <Image
          className={cn(
            "rounded-sm p-1",
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          style={{ objectFit: "cover" }}
          src={meta.src}
          alt="Mistral"
          width={width}
          height={height}
        />
      )
    case "mistral-tiny":
    case "mistral-small":
    case "mistral-medium":
      return (
        <Image
          className={cn(
            "rounded-sm p-1",
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          src={mistral.src}
          alt="Mistral"
          width={width}
          height={height}
        />
      )
    case "claude-2.1":
    case "claude-instant-1.2":
      return (
        <AnthropicSVG
          className={cn(
            "rounded-sm bg-[#fff] p-1 text-black",
            props.className,
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          width={width}
          height={height}
        />
      )
    case "gemini-pro":
    case "gemini-pro-vision":
      return (
        <GoogleSVG
          className={cn(
            "rounded-sm bg-[#fff] p-1 text-black",
            props.className,
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          width={width}
          height={height}
        />
      )
    case "pplx-7b-online":
    case "pplx-70b-online":
      return (
        <Image
          className={cn(
            "rounded-sm p-1",
            theme === "dark" ? "bg-white" : "border-[1px] border-black"
          )}
          src={perplexity.src}
          alt="Mistral"
          width={width}
          height={height}
        />
      )
    default:
      if (!modelId || modelId.includes("/")) {
        return <IconSparkles size={width} />
      } else if (modelId.includes("llama")) {
        return (
          <Image
            className={cn(
              "rounded-sm p-1",
              theme === "dark" ? "bg-white" : "border-[1px] border-black"
            )}
            src={meta.src}
            alt="Mistral"
            width={width}
            height={height}
          />
        )
      } else if (modelId.includes("mistral") || modelId.includes("mixtral")) {
        return (
          <Image
            className={cn(
              "rounded-sm p-1",
              theme === "dark" ? "bg-white" : "border-[1px] border-black"
            )}
            src={mistral.src}
            alt="Mistral"
            width={width}
            height={height}
          />
        )
      } else {
        return <IconSparkles size={width} />
      }
  }
}
