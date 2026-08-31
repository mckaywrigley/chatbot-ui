"use client"

export function ThinkingIndicator() {
  return (
    <div className="self-start">
      <div className="bg-background flex items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-200 px-4 py-3 shadow-sm dark:border-zinc-700">
        <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms] dark:bg-zinc-500" />
        <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms] dark:bg-zinc-500" />
        <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms] dark:bg-zinc-500" />
      </div>
    </div>
  )
}
