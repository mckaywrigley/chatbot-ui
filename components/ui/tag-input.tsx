"use client"

import { IconX } from "@tabler/icons-react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { Chip } from "@/components/ui/chip"

interface TagInputProps {
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
}

const TagInput: React.FC<TagInputProps> = ({
  values,
  onChange,
  placeholder,
  className
}) => {
  const [draft, setDraft] = React.useState("")

  const add = (v: string) => {
    const trimmed = v.trim()
    if (!trimmed || values.includes(trimmed)) return
    onChange([...values, trimmed])
  }

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx))
  }

  return (
    <div
      className={cn(
        "border-line bg-surface focus-within:border-rust focus-within:ring-rust-soft flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border p-2 transition-colors focus-within:ring",
        className
      )}
    >
      {values.map((v, i) => (
        <Chip
          key={`${v}-${i}`}
          variant="default"
          className="bg-paper-2 border-line"
        >
          {v}
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-ink-3 hover:text-ink flex items-center"
            aria-label={`Remove ${v}`}
          >
            <IconX size={10} />
          </button>
        </Chip>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault()
            add(draft)
            setDraft("")
          } else if (e.key === "Backspace" && !draft && values.length) {
            remove(values.length - 1)
          }
        }}
        placeholder={values.length === 0 ? placeholder : ""}
        className="text-ink placeholder:text-ink-3 min-w-[120px] flex-1 border-none bg-transparent p-1 text-[13px] outline-none"
      />
    </div>
  )
}

export { TagInput }
