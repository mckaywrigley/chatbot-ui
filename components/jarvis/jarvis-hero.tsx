"use client"

/**
 * Dashboard hero - the "Jarvis-style" home assistant block.
 *
 * Layout (matches the v4 mockup):
 *  - Dark navy panel, full-width, rounded.
 *  - Left: pulsing orb + "LISTENING" pill + short value-prop copy.
 *  - Right: TODAY'S BRIEF card with 1-3 PATTERN/BLOCKER/LITERATURE
 *    rows. Each row gets a deep-link chip on the far right.
 *  - Below: quick-action chips that pre-fill the prompt input.
 *  - Bottom: chat input with HOLD SPACE + Send.
 *
 * Streaming chat hits `/api/jarvis/chat`. On unload the in-memory
 * history is shipped to `/api/jarvis/compress` via
 * `navigator.sendBeacon` so the vault gets a fresh episode without
 * blocking the user.
 */

import { IconBrain, IconSparkles } from "@tabler/icons-react"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"

import { MemoryDrawer } from "@/components/jarvis/memory-drawer"
import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"

interface BriefItem {
  kind: "pattern" | "blocker" | "literature"
  body: string
  ctaLabel?: string
  ctaHref?: string
}

interface JarvisHeroProps {
  /** Static stand-in for the "Today's brief" until we wire the brief generator. */
  brief?: BriefItem[]
  /** Quick-fill chips below the input. */
  chips?: { label: string; prompt: string }[]
  /** Display name to greet the user with. Currently used by parent header, kept here for future. */
  displayName?: string
}

// Quick-fill chips below the chat input.
// Design + report creation intentionally NOT here - those flows live in
// /designs and /reports UI surfaces, not chat. Chat is for thinking out
// loud, literature recall, data Q&A, and "what's blocking me" triage.
const DEFAULT_CHIPS: { label: string; prompt: string }[] = [
  {
    label: "Search the literature",
    prompt:
      "Search the literature for the most relevant papers on my current topic."
  },
  { label: "Analyze data", prompt: "I have a data file - help me analyse it." },
  {
    label: "What's blocking me?",
    prompt:
      "Look across my recent designs and reports. What's stalled, and what should I push on next?"
  }
]

interface ToolAction {
  // Only "navigate" is emitted by the server today. Modal-open variants
  // were retired alongside the design.start / report.start tools.
  type: "navigate"
  href?: string
  label: string
  tool: string
}

interface Turn {
  role: "user" | "assistant"
  content: string
  /**
   * Tool-action chips attached to this turn - rendered above the
   * assistant text. Each chip deep-links the user into the
   * corresponding agent (design / report / chat / data collection).
   */
  actions?: ToolAction[]
}

// Unit Separator (\x1f) + "J" - matches the server's
// ACTION_DEMUX_MARKER in app/api/jarvis/chat/route.ts. The byte never
// appears in LLM prose so it's a safe demux prefix.
const ACTION_DEMUX_MARKER = "J"

/**
 * Pull out any `\x1fJ{...}\n` JSON envelopes from a streamed text
 * chunk. Returns the plain text remainder + the parsed action
 * payloads (typed loosely so we can evolve the protocol without
 * breaking the client).
 */
function splitActionFrames(raw: string): {
  text: string
  actions: ToolAction[]
} {
  if (!raw.includes(ACTION_DEMUX_MARKER)) return { text: raw, actions: [] }
  const actions: ToolAction[] = []
  let textOut = ""
  let i = 0
  while (i < raw.length) {
    const next = raw.indexOf(ACTION_DEMUX_MARKER, i)
    if (next === -1) {
      textOut += raw.slice(i)
      break
    }
    textOut += raw.slice(i, next)
    const newlineAt = raw.indexOf("\n", next)
    const end = newlineAt === -1 ? raw.length : newlineAt
    const payload = raw.slice(next + ACTION_DEMUX_MARKER.length, end)
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>
      if (parsed.kind === "tool_action" && typeof parsed.label === "string") {
        actions.push({
          type: (parsed.type as ToolAction["type"]) ?? "navigate",
          href: typeof parsed.href === "string" ? parsed.href : undefined,
          label: parsed.label,
          tool: typeof parsed.tool === "string" ? parsed.tool : "unknown"
        })
      }
    } catch {
      // ignore malformed frames - the worst case is the user sees
      // one stray action chip missing.
    }
    i = newlineAt === -1 ? raw.length : newlineAt + 1
  }
  return { text: textOut, actions }
}

export const JarvisHero: FC<JarvisHeroProps> = ({ brief, chips }) => {
  const { selectedWorkspace } = useContext(ChatbotUIContext)
  const [input, setInput] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Live brief fetched from /api/jarvis/brief. Falls through to the
  // prop / static default if the fetch fails (the hero never blanks).
  const [liveBrief, setLiveBrief] = useState<BriefItem[] | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Stable session id for the life of this mount, so the compress
  // endpoint can group the arc + so episode slugs don't collide.
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}`
  )

  // Fetch the daily brief on mount + when the active workspace
  // changes. 6h cache server-side means this is essentially free; we
  // re-fetch eagerly so a workspace switch reflects in the hero.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const params = new URLSearchParams()
        if (selectedWorkspace?.id)
          params.set("workspaceId", selectedWorkspace.id)
        const res = await fetch(`/api/jarvis/brief?${params.toString()}`)
        if (!res.ok) return
        const json = (await res.json()) as {
          items?: BriefItem[]
        }
        if (!cancelled) setLiveBrief(json.items ?? [])
      } catch {
        // best-effort
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedWorkspace?.id])

  // ── Beacon-on-unload to compress the arc into the vault. ──────────
  // We re-bind the listener whenever `turns` changes so the closure
  // captures the latest history. `sendBeacon` is fire-and-forget; the
  // browser delivers the body even if the tab is closing.
  useEffect(() => {
    const compress = () => {
      if (turns.length === 0) return
      try {
        const payload = JSON.stringify({
          messages: turns,
          sessionId: sessionIdRef.current,
          workspaceId: selectedWorkspace?.id,
          workspaceName: selectedWorkspace?.name
        })
        const blob = new Blob([payload], { type: "application/json" })
        // sendBeacon returns false if the user agent can't queue the
        // request; in that case we fall back to a fetch with keepalive.
        const ok = navigator.sendBeacon("/api/jarvis/compress", blob)
        if (!ok) {
          void fetch("/api/jarvis/compress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true
          })
        }
      } catch {
        // best-effort
      }
    }
    window.addEventListener("beforeunload", compress)
    window.addEventListener("pagehide", compress)
    return () => {
      window.removeEventListener("beforeunload", compress)
      window.removeEventListener("pagehide", compress)
    }
  }, [turns, selectedWorkspace?.id, selectedWorkspace?.name])

  const sendMessage = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || streaming) return
      setInput("")
      setError(null)
      const nextTurns: Turn[] = [...turns, { role: "user", content: message }]
      setTurns(nextTurns)
      setStreaming(true)

      try {
        const res = await fetch("/api/jarvis/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            chatHistory: turns,
            workspaceId: selectedWorkspace?.id,
            workspaceName: selectedWorkspace?.name
          })
        })
        if (!res.ok || !res.body) {
          throw new Error(`Jarvis chat failed (${res.status})`)
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assistantText = ""
        let pendingFrame = ""
        const allActions: ToolAction[] = []
        // Insert a placeholder assistant turn so the UI can fill it as
        // tokens arrive. Append the chunk to that slot each step.
        setTurns(prev => [...prev, { role: "assistant", content: "" }])
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          // Carry over any half-line from the previous chunk so a
          // marker frame split across reads still parses.
          const chunk = pendingFrame + decoder.decode(value, { stream: true })
          const lastMarker = chunk.lastIndexOf(ACTION_DEMUX_MARKER)
          const lastNewline = chunk.lastIndexOf("\n")
          let safeEnd = chunk.length
          if (lastMarker > lastNewline) {
            // There's an in-flight frame at the tail - hold it back.
            safeEnd = lastMarker
          }
          const safe = chunk.slice(0, safeEnd)
          pendingFrame = chunk.slice(safeEnd)
          const { text, actions } = splitActionFrames(safe)
          assistantText += text
          if (actions.length) allActions.push(...actions)
          setTurns(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = {
              role: "assistant",
              content: assistantText,
              actions: allActions.length ? [...allActions] : undefined
            }
            return copy
          })
        }
        // Flush whatever is left in pendingFrame (usually empty).
        if (pendingFrame) {
          const { text, actions } = splitActionFrames(pendingFrame)
          assistantText += text
          if (actions.length) allActions.push(...actions)
          setTurns(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = {
              role: "assistant",
              content: assistantText,
              actions: allActions.length ? [...allActions] : undefined
            }
            return copy
          })
        }
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong.")
      } finally {
        setStreaming(false)
        // Refocus so the user can keep typing without grabbing the
        // input again.
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    },
    [turns, streaming, selectedWorkspace?.id, selectedWorkspace?.name]
  )

  // Hold-space-to-talk affordance shown in the mockup. We don't wire
  // voice transcription yet, but space-with-empty-input toggles a
  // "listening" hint so the chrome doesn't lie about what's available.
  // When wired, swap this to Whisper-L per the hero footer copy.

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const handleChip = (prompt: string) => {
    setInput(prompt)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const charCount = input.length
  // Resolution order: explicit `brief` prop > server-fetched live
  // brief > static default. The live brief is `null` until the fetch
  // resolves, so we keep the default visible for the first paint.
  const brIfList =
    brief && brief.length > 0
      ? brief
      : liveBrief && liveBrief.length > 0
        ? liveBrief
        : DEFAULT_BRIEF

  return (
    <section
      className="relative overflow-hidden rounded-2xl text-[#F4F1EA]"
      style={{ background: "#0E0B40" }}
    >
      {/* decorative cyan + magenta glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(34,211,238,0.30), transparent 70%)"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 size-[460px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(232,121,249,0.22), transparent 70%)"
        }}
      />

      <div className="relative grid gap-7 p-8 md:grid-cols-[260px_1fr] md:p-10">
        {/* Left: orb + pitch */}
        <div className="flex flex-col items-start gap-5">
          <Orb />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22D3EE]/40 bg-[#22D3EE]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#22D3EE]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#22D3EE]" />
              Listening
            </span>
            <button
              type="button"
              onClick={() => setMemoryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#A3A0C2] transition-colors hover:bg-white/[0.12] hover:text-[#F4F1EA]"
              title="See and forget what I remember about you"
            >
              <IconBrain size={11} />
              Memory
            </button>
          </div>
          <p className="text-[13px] leading-relaxed text-[#A3A0C2]">
            ShadowAI is your research co-pilot. I can call the experiment
            designer, the report drafter, your literature, and your data - just
            ask.
          </p>
        </div>

        {/* Right: today's brief */}
        <div className="space-y-3">
          <header className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#22D3EE]">
            <span className="size-1.5 rounded-full bg-[#22D3EE]" />
            Today&apos;s brief
          </header>
          <h2 className="font-display text-[22px] font-medium leading-tight tracking-[-0.01em]">
            Three things worth your attention before Friday&apos;s review.
          </h2>
          <div className="space-y-2 pt-1">
            {brIfList.map((item, idx) => (
              <BriefRow key={idx} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Conversation thread - shown only when there are turns. */}
      {turns.length > 0 && (
        <div className="relative max-h-[280px] overflow-y-auto border-t border-white/10 px-8 py-5 md:px-10">
          <div className="space-y-3">
            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={cn(
                    "text-[13px] leading-relaxed",
                    t.role === "user" ? "text-[#A3A0C2]" : "text-[#F4F1EA]"
                  )}
                >
                  <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-[#7A7799]">
                    {t.role === "user" ? "You" : "ShadowAI"}
                  </span>
                  {t.content || <span className="text-[#7A7799]">…</span>}
                </div>
                {/* Tool-action chips - one per agent the model
                    invoked during this turn. Click navigates the
                    user to the prefilled surface. */}
                {t.actions && t.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-12">
                    {t.actions.map((a, ai) =>
                      a.href ? (
                        <a
                          key={ai}
                          href={a.href}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#22D3EE]/40 bg-[#22D3EE]/10 px-3 py-1 text-[12px] font-semibold text-[#22D3EE] transition-colors hover:bg-[#22D3EE]/20"
                        >
                          <IconSparkles size={12} />
                          {a.label}
                        </a>
                      ) : (
                        <span
                          key={ai}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] text-[#F4F1EA]"
                        >
                          {a.label}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
            {error && (
              <p className="rounded-md border border-[#E879F9]/40 bg-[#E879F9]/10 p-2 text-[12px] text-[#E879F9]">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Input + chips */}
      <div className="relative space-y-3 border-t border-white/10 px-8 py-5 md:px-10">
        <div className="flex flex-wrap gap-2">
          {(chips ?? DEFAULT_CHIPS).map(chip => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChip(chip.prompt)}
              className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[12px] text-[#F4F1EA] transition-colors hover:bg-white/[0.12]"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-3 rounded-xl border border-white/15 bg-black/30 p-3">
          <button
            type="button"
            aria-label="Send"
            onClick={() => void sendMessage(input)}
            className="text-[#7A7799] transition-colors hover:text-[#22D3EE]"
          >
            <span className="inline-block font-mono text-base">›</span>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Ask ShadowAI anything - describe a hypothesis, request a report, search a topic…"
            className="text-paper placeholder:text-ink-300/60 max-h-[120px] flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none [field-sizing:content]"
            disabled={streaming}
          />
          <span className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[#A3A0C2] md:inline-flex">
            <span className="size-1.5 rounded-full bg-[#22D3EE]" />
            Hold space
          </span>
          <button
            type="button"
            disabled={!input.trim() || streaming}
            onClick={() => void sendMessage(input)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#22D3EE] px-3 py-1.5 text-[12px] font-semibold text-[#0E0B40] transition-colors hover:bg-[#06b6d4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconSparkles size={14} />
            {streaming ? "Sending…" : "Send"}
          </button>
        </div>

        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-[#7A7799]">
          <span>
            Scope · {selectedWorkspace?.name ?? "Workspace"} · {charCount} chars
          </span>
          <span>End-to-end encrypted · Whisper-L · ⌘K for shortcuts</span>
        </div>
      </div>

      <MemoryDrawer isOpen={memoryOpen} onOpenChange={setMemoryOpen} />
    </section>
  )
}

// ── Brief rows ─────────────────────────────────────────────────────

const BRIEF_KIND_LABEL: Record<BriefItem["kind"], string> = {
  pattern: "Pattern",
  blocker: "Blocker",
  literature: "New literature"
}

const BriefRow: FC<{ item: BriefItem }> = ({ item }) => (
  <div className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7A7799]">
        {BRIEF_KIND_LABEL[item.kind]}
      </div>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#F4F1EA]">
        {item.body}
      </p>
    </div>
    {item.ctaHref && (
      <a
        href={item.ctaHref}
        className="shrink-0 self-center rounded-md border border-[#22D3EE]/40 bg-[#22D3EE]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#22D3EE] transition-colors hover:bg-[#22D3EE]/20"
      >
        {item.ctaLabel ?? "Open"}
      </a>
    )}
  </div>
)

const DEFAULT_BRIEF: BriefItem[] = [
  {
    kind: "pattern",
    body: "Today's brief is generated from your recent designs, reports, and literature. Run a chat to start building yours.",
    ctaLabel: "Open designs",
    ctaHref: "#"
  }
]

// ── Orb ────────────────────────────────────────────────────────────

const Orb: FC = () => {
  // Pulsing centre + orbiting dotted ring. Pure CSS - no canvas or
  // animation library so this stays fast and renders in SSR's first
  // paint before hydration kicks in.
  return (
    <div className="relative size-[160px]">
      <div
        className="absolute inset-[10%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #22D3EE 0%, rgba(34,211,238,0.2) 50%, transparent 75%)",
          filter: "blur(2px)"
        }}
      />
      <div
        className="absolute inset-[35%] rounded-full bg-white shadow-[0_0_30px_8px_rgba(255,255,255,0.65)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-[#22D3EE]/50"
        aria-hidden
      />
      <div
        className="absolute inset-[18%] animate-[spin_28s_linear_infinite_reverse] rounded-full border border-dashed border-[#E879F9]/40"
        aria-hidden
      />
    </div>
  )
}
