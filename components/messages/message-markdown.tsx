import React, { FC } from "react"
import { IconAlertTriangle } from "@tabler/icons-react"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { cn } from "@/lib/utils"
import {
  claimsAppliedWithoutPatch,
  DesignPatchBlock,
  extractDesignPatches
} from "./design-patch-block"
import { MessageCodeBlock } from "./message-codeblock"
import { MessageMarkdownMemoized } from "./message-markdown-memoized"

/**
 * Render `[N]` tokens as styled citation chips. When the chat passes a
 * `sources` array, each chip resolves to the source's URL on click +
 * shows title/section in a tooltip; otherwise we render plain styled
 * pills so the answer's reference markers stay visible.
 */
const CITATION_RE = /\[(\d{1,3})\]/g

function renderCitations(
  text: string,
  sources?: Array<{
    source_title?: string | null
    source_url?: string | null
    source_section?: string | null
  }>
): React.ReactNode[] {
  if (typeof text !== "string" || !text.includes("[")) return [text]
  const out: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  CITATION_RE.lastIndex = 0
  while ((match = CITATION_RE.exec(text)) !== null) {
    const n = parseInt(match[1], 10)
    if (match.index > lastIndex) out.push(text.slice(lastIndex, match.index))
    const src = sources?.[n - 1]
    const title = src?.source_title ?? `Source ${n}`
    const section = src?.source_section
    const tooltip = section ? `${title} - ${section}` : title
    if (src?.source_url) {
      out.push(
        <a
          key={`cite-${match.index}`}
          href={src.source_url}
          target="_blank"
          rel="noreferrer"
          title={tooltip}
          className="bg-rust-soft text-rust hover:bg-rust hover:text-paper mx-0.5 inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md px-1 align-middle font-mono text-[10.5px] font-semibold no-underline transition-colors"
        >
          {n}
        </a>
      )
    } else {
      out.push(
        <span
          key={`cite-${match.index}`}
          title={tooltip}
          className="bg-paper-2 text-ink-2 mx-0.5 inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md px-1 align-middle font-mono text-[10.5px] font-semibold"
        >
          {n}
        </span>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex))
  return out
}

export interface MessageCitationSource {
  source_title?: string | null
  source_url?: string | null
  source_section?: string | null
}

// Enhanced chemical formula and math rendering component
const ChemicalFormula: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const formulaText = React.Children.toArray(children).join("")

  // Basic chemical formula formatting (subscripts/superscripts)
  const formatChemical = (text: string) => {
    return text
      .replace(/(\d+)/g, "<sub>$1</sub>") // Numbers become subscripts
      .replace(/\^(\d+[\+\-]?)/g, "<sup>$1</sup>") // Charges become superscripts
      .replace(/(\+|\-)/g, "<sup>$1</sup>") // Isolated charges
  }

  return (
    <span
      className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm dark:bg-zinc-800"
      dangerouslySetInnerHTML={{ __html: formatChemical(formulaText) }}
    />
  )
}

interface MessageMarkdownProps {
  content: string
  isUser?: boolean
  /**
   * Sources used to resolve `[N]` citation markers into clickable chips.
   * Index N corresponds to `sources[N-1]`. When omitted, markers render
   * as styled pills without click handlers.
   */
  sources?: MessageCitationSource[]
}

export const MessageMarkdown: FC<MessageMarkdownProps> = ({
  content,
  isUser = false,
  sources
}) => {
  // Enhanced content preprocessing for scientific notation
  const preprocessContent = (text: string) => {
    // Handle scientific notation (e.g., 1.23e-4 -> 1.23 × 10^-4)
    text = text.replace(/(\d+\.?\d*)[eE]([\+\-]?\d+)/g, "$1 × 10^$2")

    // Handle degree symbols
    text = text.replace(/(\d+)\s*deg(rees?)?/gi, "$1°")
    text = text.replace(/(\d+)\s*celsius/gi, "$1°C")
    text = text.replace(/(\d+)\s*fahrenheit/gi, "$1°F")

    return text
  }

  const processedContent = preprocessContent(content)

  // Pull `<design-patch>…</design-patch>` blocks out of the assistant text and
  // render them as interactive Approve / Reject cards. The block format is
  // documented in components/messages/design-patch-block.tsx and the design
  // detail page listens for the `design:apply-patch` window event that Approve
  // fires. Messages with no patches go straight through unchanged.
  const segments = extractDesignPatches(processedContent)
  const hasPatch = segments.some(s => s.kind === "patch")

  const markdownClassName = cn(
    "prose prose-p:leading-relaxed prose-pre:p-0 min-w-full space-y-6 break-words",
    isUser
      ? "prose-invert prose-code:bg-blue-500/30 prose-code:text-white prose-a:text-blue-200 prose-strong:text-white prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
      : "dark:prose-invert prose-code:bg-slate-100 prose-code:dark:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
  )

  const renderText = (text: string, key?: string | number) => (
    <MessageMarkdownMemoized
      key={key}
      className={markdownClassName}
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        // Walk paragraph children, replacing `[N]` tokens inside any
        // string nodes with citation chips. Non-string children pass
        // through (so links / formatting inside paragraphs are
        // preserved).
        p({ children }) {
          const arr = React.Children.toArray(children).flatMap(child =>
            typeof child === "string"
              ? renderCitations(child, sources)
              : [child]
          )
          return <p className="mb-2 last:mb-0">{arr}</p>
        },
        // Citation chips also appear inside the model's "References" list
        // at the end of the answer, which renders as <ul><li>[1] ...</li>
        // …</ul>. Apply the same `[N]` → chip transform to <li> children
        // so reference items become clickable.
        li({ children, ...props }) {
          const arr = React.Children.toArray(children).flatMap(child =>
            typeof child === "string"
              ? renderCitations(child, sources)
              : [child]
          )
          return <li {...props}>{arr}</li>
        },
        img({ node, alt, ...props }) {
          // Markdown image - src is fully dynamic (could be a remote URL the
          // model emitted or a data URI), so next/image isn't viable here:
          // we'd have to register every remote domain in next.config.js, and
          // data URIs aren't supported at all. Plain <img> is the right call.
          // eslint-disable-next-line @next/next/no-img-element
          return <img className="max-w-[67%]" alt={alt ?? ""} {...props} />
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
          const codeText = String(childArray)

          // Detect if this might be a chemical formula
          if (
            typeof firstChildAsString === "string" &&
            !firstChildAsString.includes("\n") &&
            /^[A-Za-z0-9\+\-\(\)\[\]]+$/.test(firstChildAsString) &&
            /[A-Z][a-z]*\d*/.test(firstChildAsString)
          ) {
            return <ChemicalFormula>{childArray}</ChemicalFormula>
          }

          if (
            typeof firstChildAsString === "string" &&
            !firstChildAsString.includes("\n")
          ) {
            return (
              <code
                className={cn(
                  className,
                  "rounded px-1 py-0.5 font-mono text-sm",
                  isUser
                    ? "bg-blue-500/30 text-white"
                    : "bg-slate-100 dark:bg-zinc-800"
                )}
                {...props}
              >
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
      {text}
    </MessageMarkdownMemoized>
  )

  if (!hasPatch) {
    // The model sometimes narrates an edit it never proposed. Nothing changes
    // the design except approving a patch card, so flag it rather than let the
    // researcher believe their protocol was updated.
    if (!isUser && claimsAppliedWithoutPatch(processedContent)) {
      return (
        <div className="space-y-2">
          {renderText(processedContent)}
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              <b>No change was made to the design.</b> Edits only take effect
              when you approve a proposed change card. Ask for the edit again -
              say which section it belongs in - and one will appear here.
            </span>
          </div>
        </div>
      )
    }
    return renderText(processedContent)
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === "patch" ? (
          <DesignPatchBlock key={`patch-${i}`} patch={seg.patch} />
        ) : (
          renderText(seg.value, `text-${i}`)
        )
      )}
    </>
  )
}
