import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { IconCheck, IconCopy, IconDownload } from "@tabler/icons-react"
import { FC, memo } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"

interface MessageCodeBlockProps {
  language: string
  value: string
}

interface languageMap {
  [key: string]: string | undefined
}

export const programmingLanguages: languageMap = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  c: ".c",
  cpp: ".cpp",
  "c++": ".cpp",
  "c#": ".cs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  "objective-c": ".m",
  kotlin: ".kt",
  typescript: ".ts",
  go: ".go",
  perl: ".pl",
  rust: ".rs",
  scala: ".scala",
  haskell: ".hs",
  lua: ".lua",
  shell: ".sh",
  sql: ".sql",
  html: ".html",
  css: ".css"
}

export const generateRandomString = (length: number, lowercase = false) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789" // excluding similar looking characters like Z, 2, I, 1, O, 0
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return lowercase ? result.toLowerCase() : result
}

export const MessageCodeBlock: FC<MessageCodeBlockProps> = memo(
  ({ language, value }) => {
    const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

    const downloadAsFile = () => {
      if (typeof window === "undefined") {
        return
      }
      const fileExtension = programmingLanguages[language] || ".file"
      const suggestedFileName = `file-${generateRandomString(
        3,
        true
      )}${fileExtension}`
      const fileName = window.prompt("Enter file name", suggestedFileName)

      if (!fileName) {
        return
      }

      const blob = new Blob([value], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = fileName
      link.href = url
      link.style.display = "none"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    const onCopy = () => {
      if (isCopied) return
      copyToClipboard(value)
    }

    return (
      <div className="codeblock relative w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 font-sans shadow-sm">
        <div className="flex w-full items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-2 text-white">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-300">
            {language || "code"}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 transition-colors hover:bg-zinc-700 focus-visible:ring-1 focus-visible:ring-slate-700 focus-visible:ring-offset-0"
              onClick={downloadAsFile}
            >
              <IconDownload size={14} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 transition-colors hover:bg-zinc-700 focus-visible:ring-1 focus-visible:ring-slate-700 focus-visible:ring-offset-0"
              onClick={onCopy}
            >
              {isCopied ? (
                <IconCheck size={14} className="text-green-400" />
              ) : (
                <IconCopy size={14} />
              )}
            </Button>
          </div>
        </div>
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers={value.split("\n").length > 10}
          customStyle={{
            margin: 0,
            width: "100%",
            background: "transparent",
            padding: "1rem"
          }}
          lineNumberStyle={{
            color: "#6b7280",
            fontSize: "12px",
            minWidth: "2.5em",
            paddingRight: "1em",
            textAlign: "right",
            userSelect: "none"
          }}
          codeTagProps={{
            style: {
              fontSize: "13px",
              fontFamily:
                "ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Menlo', monospace",
              lineHeight: "1.5"
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    )
  }
)

MessageCodeBlock.displayName = "MessageCodeBlock"
