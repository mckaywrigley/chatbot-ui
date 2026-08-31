"use client"

/**
 * Memory drawer - lets the user audit and prune the Jarvis vault.
 *
 * Opens as a right-side sheet from the dashboard. Each row shows one
 * compressed episode (date, title, intent, topics, excerpt) plus a
 * trash button that hits DELETE /api/jarvis/episodes?slug=… and
 * removes the entry from the vault. The intent is consent + control:
 * users can see exactly what the assistant remembers and forget any
 * piece of it.
 */

import { IconBrain, IconTrash, IconX } from "@tabler/icons-react"
import { FC, useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EpisodeRow {
  slug: string
  createdAt: string
  title: string
  intent: string
  priority: number
  topics: string[]
  references: { kind: string; id: string; title: string }[]
  excerpt: string
}

interface MemoryDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export const MemoryDrawer: FC<MemoryDrawerProps> = ({
  isOpen,
  onOpenChange
}) => {
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/jarvis/episodes?limit=40")
      if (!res.ok) throw new Error(`Memory fetch failed (${res.status})`)
      const json = (await res.json()) as {
        ok: boolean
        episodes: EpisodeRow[]
      }
      setEpisodes(json.episodes ?? [])
    } catch (e: any) {
      setError(e?.message ?? "Could not load memory.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) void load()
  }, [isOpen, load])

  const handleForget = async (slug: string) => {
    setDeleting(slug)
    try {
      const res = await fetch(
        `/api/jarvis/episodes?slug=${encodeURIComponent(slug)}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error(`Forget failed (${res.status})`)
      setEpisodes(prev => prev.filter(ep => ep.slug !== slug))
    } catch (e: any) {
      setError(e?.message ?? "Could not forget that one.")
    } finally {
      setDeleting(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close memory drawer"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Sheet */}
      <aside
        className="border-line bg-paper relative z-10 flex size-full max-w-[460px] flex-col border-l shadow-2xl"
        role="dialog"
        aria-label="Memory"
      >
        <header className="border-line flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="bg-rust-soft text-rust flex size-8 items-center justify-center rounded-md">
              <IconBrain size={18} />
            </span>
            <div>
              <h2 className="text-ink text-[14px] font-semibold">
                What I remember
              </h2>
              <p className="text-ink-3 text-[11.5px]">
                Compressed memory from your past chats. Click forget to remove.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="text-ink-3 hover:text-ink rounded-md p-1.5"
          >
            <IconX size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="text-ink-3 flex items-center justify-center py-12 text-xs">
              <span className="border-line border-t-rust mr-2 size-4 animate-spin rounded-full border-2" />
              Loading memory…
            </div>
          )}
          {error && (
            <p className="bg-rust-soft text-rust-ink rounded-md p-3 text-[12.5px]">
              {error}
            </p>
          )}
          {!loading && !error && episodes.length === 0 && (
            <div className="text-ink-3 py-12 text-center text-xs">
              No memory episodes yet. Have a chat - the assistant will compress
              it once you close the tab.
            </div>
          )}
          <ul className="space-y-3">
            {episodes.map(ep => (
              <li
                key={ep.slug}
                className={cn(
                  "border-line bg-surface rounded-lg border p-3.5",
                  deleting === ep.slug && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-ink-3 font-mono text-[10.5px] uppercase tracking-widest">
                      {new Date(ep.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                      {" · "}
                      <span className="text-ink-2">{ep.intent}</span>
                      {" · p"}
                      {ep.priority}
                    </div>
                    <h3 className="text-ink mt-0.5 truncate text-[13.5px] font-semibold">
                      {ep.title}
                    </h3>
                    {ep.topics.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {ep.topics.map(t => (
                          <span
                            key={t}
                            className="bg-paper-2 text-ink-3 rounded-full px-2 py-0.5 text-[10.5px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {ep.excerpt && (
                      <p className="text-ink-2 mt-2 line-clamp-3 text-[12px] leading-relaxed">
                        {ep.excerpt}
                      </p>
                    )}
                    {ep.references.length > 0 && (
                      <div className="text-ink-3 mt-1.5 text-[11px]">
                        Refs:{" "}
                        {ep.references
                          .slice(0, 3)
                          .map(r => `${r.kind}: ${r.title}`)
                          .join(" · ")}
                        {ep.references.length > 3
                          ? ` · +${ep.references.length - 3}`
                          : ""}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleForget(ep.slug)}
                    disabled={deleting === ep.slug}
                    title="Forget this episode"
                    aria-label="Forget this episode"
                    className="text-ink-3 hover:text-destructive shrink-0"
                  >
                    <IconTrash size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
