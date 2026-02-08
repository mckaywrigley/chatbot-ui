"use client"

import { ExternalLink, Globe, FileText } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface SourceCitationProps {
  sourceNumber: number
  messageContent: string
  sourceData?: any // Optional direct source data from metadata
}

export function SourceCitation({
  sourceNumber,
  messageContent,
  sourceData
}: SourceCitationProps) {
  // Check if this is a web source
  const isWebSource =
    sourceData?.documentType === "Web Search" ||
    sourceData?.fileName?.startsWith("http")

  // Get the URL if available
  const getUrl = (): string | null => {
    if (sourceData?.fileName?.startsWith("http")) {
      return sourceData.fileName
    }
    return null
  }

  // Get display title
  const getTitle = (): string => {
    if (sourceData?.title) {
      return sourceData.title
    }
    if (sourceData?.fileName && !sourceData.fileName.startsWith("http")) {
      return sourceData.fileName
    }
    return `Source ${sourceNumber}`
  }

  // Get domain for web sources
  const getDomain = (): string | null => {
    const url = getUrl()
    if (url) {
      try {
        return new URL(url).hostname.replace("www.", "")
      } catch {
        return null
      }
    }
    return null
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const url = getUrl()
    if (url) {
      try {
        const urlObj = new URL(url)
        urlObj.searchParams.set("utm_source", "rooftopsai")
        urlObj.searchParams.set("utm_medium", "chat")
        urlObj.searchParams.set("utm_campaign", "source_citation")
        window.open(urlObj.toString(), "_blank", "noopener,noreferrer")
      } catch {
        window.open(url, "_blank", "noopener,noreferrer")
      }
    }
  }

  const url = getUrl()
  const domain = getDomain()
  const title = getTitle()
  const isClickable = !!url

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            onClick={isClickable ? handleClick : undefined}
            className={`
              not-prose
              mx-0.5 inline-flex items-center gap-1
              rounded-full px-2 py-0.5 text-xs font-medium
              transition-all duration-150
              ${
                isClickable
                  ? "cursor-pointer bg-cyan-100 text-cyan-700 hover:bg-cyan-200 hover:text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-800/50"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }
            `}
          >
            {isWebSource ? (
              <Globe className="size-3" />
            ) : (
              <FileText className="size-3" />
            )}
            <span>{sourceNumber}</span>
            {isClickable && <ExternalLink className="size-2.5 opacity-60" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs" sideOffset={5}>
          <div className="space-y-1">
            <p className="line-clamp-2 font-medium">{title}</p>
            {domain && (
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Globe className="size-3" />
                {domain}
              </p>
            )}
            {isClickable && (
              <p className="text-xs text-cyan-600 dark:text-cyan-400">
                Click to open source
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
