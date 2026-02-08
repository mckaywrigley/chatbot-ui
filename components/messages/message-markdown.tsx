import React, { FC, useMemo } from "react"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { MessageCodeBlock } from "./message-codeblock"
import { MessageMarkdownMemoized } from "./message-markdown-memoized"
import { useDocumentStore } from "@/lib/stores/document-store"
import { IconFileText } from "@tabler/icons-react"
import { SourceCitation } from "../chat/source-citation"

interface MessageMarkdownProps {
  content: string
  metadata?: string // JSON string containing source metadata
}

export const MessageMarkdown: FC<MessageMarkdownProps> = ({
  content,
  metadata
}) => {
  const { loadDocument, setDocumentMode } = useDocumentStore()

  // Parse metadata to get sources - memoized to avoid reparsing on each render
  const sourcesMap = useMemo(() => {
    const map: { [key: number]: any } = {}
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata)
        if (parsed.sources && Array.isArray(parsed.sources)) {
          parsed.sources.forEach((source: any) => {
            map[source.sourceNumber] = source
          })
        }
      } catch (error) {
        console.error(
          "[MessageMarkdown] Error parsing message metadata:",
          error
        )
      }
    }
    return map
  }, [metadata])

  // Check if this contains our special document marker
  const documentMarkerRegex = /DOCUMENT_ID:(doc_\d+)/
  const documentMatch = content.match(documentMarkerRegex)

  // If we found a document marker, render a button instead of the normal content
  if (documentMatch) {
    const documentId = documentMatch[1]

    const handleOpenDocument = () => {
      loadDocument(documentId)
      setDocumentMode(true)
    }

    return (
      <div className="space-y-4">
        <p>I&apos;ve created a document based on your request.</p>

        <div
          onClick={handleOpenDocument}
          className="flex cursor-pointer items-center rounded-lg border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
        >
          <div className="mr-3 shrink-0 text-blue-500">
            <IconFileText size={24} />
          </div>
          <div>
            <div className="font-medium">Document Ready</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Click to view and edit the document
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Helper function to process source citations in any text content
  const processSourceCitations = (child: any, keyPrefix: string = ""): any => {
    if (typeof child === "string") {
      const sourcePattern = /\[Source (\d+)\]/g
      const matches = Array.from(child.matchAll(sourcePattern))

      if (matches.length > 0) {
        const parts: any[] = []
        let lastIndex = 0

        matches.forEach((match, idx) => {
          const fullMatch = match[0]
          const sourceNum = parseInt(match[1])
          const matchIndex = match.index!

          // Add text before the match
          if (matchIndex > lastIndex) {
            parts.push(child.substring(lastIndex, matchIndex))
          }

          // Add the citation component
          const sourceData = sourcesMap[sourceNum]
          parts.push(
            <SourceCitation
              key={`${keyPrefix}source-${sourceNum}-${matchIndex}-${idx}`}
              sourceNumber={sourceNum}
              messageContent={content}
              sourceData={sourceData}
            />
          )

          lastIndex = matchIndex + fullMatch.length
        })

        // Add remaining text after last match
        if (lastIndex < child.length) {
          parts.push(child.substring(lastIndex))
        }

        return parts
      }
    }
    // Recursively process React elements with children
    if (React.isValidElement(child) && child.props.children) {
      const processedChildren = React.Children.map(
        child.props.children,
        (c, i) => processSourceCitations(c, `${keyPrefix}${i}-`)
      )
      return React.cloneElement(child, {}, processedChildren)
    }
    return child
  }

  // Regular markdown rendering for non-document messages
  return (
    <MessageMarkdownMemoized
      className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 min-w-full space-y-2 break-words"
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        p({ children }) {
          const processedChildren = React.Children.map(children, (child, i) =>
            processSourceCitations(child, `p-${i}-`)
          )
          return <p className="mb-2 last:mb-0">{processedChildren}</p>
        },
        li({ children }) {
          const processedChildren = React.Children.map(children, (child, i) =>
            processSourceCitations(child, `li-${i}-`)
          )
          return <li>{processedChildren}</li>
        },
        span({ children, ...props }) {
          const processedChildren = React.Children.map(children, (child, i) =>
            processSourceCitations(child, `span-${i}-`)
          )
          return <span {...props}>{processedChildren}</span>
        },
        strong({ children }) {
          const processedChildren = React.Children.map(children, (child, i) =>
            processSourceCitations(child, `strong-${i}-`)
          )
          return <strong>{processedChildren}</strong>
        },
        em({ children }) {
          const processedChildren = React.Children.map(children, (child, i) =>
            processSourceCitations(child, `em-${i}-`)
          )
          return <em>{processedChildren}</em>
        },
        img({ node, ...props }) {
          return <img className="max-w-[67%]" {...props} />
        },
        code({ node, className, children, ...props }) {
          const childArray = React.Children.toArray(children)
          const firstChild = childArray[0] as React.ReactElement
          const firstChildAsString = React.isValidElement(firstChild)
            ? (firstChild as React.ReactElement).props.children
            : firstChild

          if (firstChildAsString === "▍") {
            return <span className="mt-1 animate-pulse cursor-default">▍</span>
          }

          if (typeof firstChildAsString === "string") {
            childArray[0] = firstChildAsString.replace("`▍`", "▍")
          }

          const match = /language-(\w+)/.exec(className || "")

          if (
            typeof firstChildAsString === "string" &&
            !firstChildAsString.includes("\n")
          ) {
            return (
              <code className={className} {...props}>
                {childArray}
              </code>
            )
          }

          return (
            <MessageCodeBlock
              key={Math.random()}
              language={(match && match[1]) || ""}
              value={String(childArray).replace(/\n$/, "")}
              {...props}
            />
          )
        }
      }}
    >
      {content}
    </MessageMarkdownMemoized>
  )
}
