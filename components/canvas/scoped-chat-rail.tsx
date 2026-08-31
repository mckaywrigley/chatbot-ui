"use client"

import { ChatUI } from "@/components/chat/chat-ui"
import { createChat, getChatByScope, updateChat } from "@/db/chats"
import { ChatbotUIContext } from "@/context/context"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/browser-client"
import type { Tables } from "@/supabase/types"
import {
  IconBrain,
  IconExternalLink,
  IconMessage,
  IconPlus
} from "@tabler/icons-react"
import { useParams, useRouter } from "next/navigation"
import { ReactNode, useContext, useEffect, useState } from "react"

export type ChatScope = "project" | "design" | "report"

interface ScopedChatRailProps {
  scope: ChatScope
  scopeId?: string
  scopeName?: string
  /** Small line under the name - e.g. which design version is in context. */
  scopeMeta?: string
  className?: string
  headerSlot?: ReactNode
  /** If true, a pinned thread is auto-created as soon as none is found. */
  autoStart?: boolean
  /**
   * Optional scope-specific context injected into the chat's system prompt.
   * For design scope, this should be a summary of the current problem,
   * selected hypotheses, and active design so the assistant answers in
   * reference to the current experiment without the user re-supplying it.
   */
  contextPrompt?: string
}

const SCOPE_LABELS: Record<ChatScope, string> = {
  project: "Project Chat",
  design: "Shadow AI chat",
  report: "Report Chat"
}

// `chats.prompt` has a DB CHECK (char_length(prompt) <= 100000). The design
// scope injects the whole experiment as context, which can be large, so clamp
// the persisted system prompt below the column limit (with a little headroom).
// Without this, createChat throws `chats_prompt_check` and the chat won't open.
const MAX_CHAT_PROMPT_CHARS = 99_000

// Design/report chats dump the whole document into the system prompt (tier-3
// long-context, up to ~25k tokens). The buildFinalMessages token budget must be
// large enough to hold that PLUS the conversation, or it drops the user's turns
// (the workspace default of 4096 is far too small). The model (gpt-5.x) has a
// large window, so give these scopes a generous budget.
const TIER3_CONTEXT_LENGTH = 128_000
const clampPrompt = (s: string) =>
  s.length > MAX_CHAT_PROMPT_CHARS
    ? s.slice(0, MAX_CHAT_PROMPT_CHARS) + "\n\n…[context truncated]"
    : s

/**
 * Right-rail chat with a single pinned thread per (scope, scope_id).
 *
 * Load strategy:
 *  - If the current route is already on a chat page (has :chatid param), defer
 *    to the existing ChatUI so we don't fight the URL-driven load.
 *  - Otherwise resolve the pinned thread for this scope. If one exists, show a
 *    link to open it full-screen. If not, offer a one-click "Start thread"
 *    action that creates the row with scope/scope_id set.
 *
 *  Full auto-load (rendering the pinned thread inline without a route change)
 *  requires refactoring ChatUI to drive from selectedChat rather than
 *  params.chatid. Tracked as a follow-up.
 */
export function ScopedChatRail({
  scope,
  scopeId,
  scopeName,
  scopeMeta,
  className,
  headerSlot,
  autoStart = false,
  contextPrompt
}: ScopedChatRailProps) {
  const params = useParams()
  const router = useRouter()
  const { selectedWorkspace, chatSettings } = useContext(ChatbotUIContext)

  const [pinnedChat, setPinnedChat] = useState<Tables<"chats"> | null>(null)
  // `resolved` flips true only once the scope lookup has SETTLED (found a
  // thread or confirmed there's none). The auto-start effect waits on this so
  // it can't fire before the lookup completes - the old `resolving`-starts-
  // false flag let auto-start race ahead and create a duplicate thread (or, on
  // a swallowed createChat error, leave the rail stuck with nothing started).
  const [resolved, setResolved] = useState(false)
  const [creating, setCreating] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const onChatRoute = Boolean(params.chatid)

  useEffect(() => {
    // On a chat route ChatUI drives itself; nothing to resolve here.
    if (!scopeId || onChatRoute) {
      setResolved(true)
      return
    }
    let cancelled = false
    setResolved(false)
    getChatByScope(scope, scopeId)
      .then(chat => {
        if (!cancelled) setPinnedChat(chat ?? null)
      })
      .catch(() => {
        if (!cancelled) setPinnedChat(null)
      })
      .finally(() => {
        if (!cancelled) setResolved(true)
      })
    return () => {
      cancelled = true
    }
  }, [scope, scopeId, onChatRoute])

  useEffect(() => {
    if (!autoStart) return
    if (onChatRoute) return
    if (!resolved) return
    if (pinnedChat) return
    if (!scopeId || !selectedWorkspace) return
    if (creating) return
    if (startError) return // don't auto-retry a failed start; let the user click
    void handleStartThread()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, onChatRoute, resolved, pinnedChat, scopeId, selectedWorkspace])

  // Keep the pinned chat's system prompt in sync with the current scope context
  // (e.g. when the user edits the design or picks different hypotheses).
  useEffect(() => {
    if (!pinnedChat || !contextPrompt) return
    const trimmed = contextPrompt.trim()
    if (!trimmed) return
    const current = pinnedChat.prompt ?? ""
    if (current.includes(trimmed)) return
    const base = chatSettings?.prompt ?? selectedWorkspace?.default_prompt ?? ""
    const merged = clampPrompt(`${base ? base.trim() + "\n\n" : ""}${trimmed}`)
    void updateChat(pinnedChat.id, { prompt: merged })
      .then(updated => setPinnedChat(updated))
      .catch(err => console.warn("Failed to refresh chat context:", err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedChat?.id, contextPrompt])

  const handleStartThread = async () => {
    if (!scopeId || !selectedWorkspace) return
    setCreating(true)
    setStartError(null)
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")

      const basePrompt =
        chatSettings?.prompt ?? selectedWorkspace.default_prompt ?? ""
      const prompt = clampPrompt(
        contextPrompt && contextPrompt.trim()
          ? `${basePrompt ? basePrompt.trim() + "\n\n" : ""}${contextPrompt.trim()}`
          : basePrompt
      )

      const chat = await createChat({
        user_id: user.id,
        workspace_id: selectedWorkspace.id,
        name: `${SCOPE_LABELS[scope]} - ${scopeName ?? scopeId.slice(0, 6)}`,
        scope,
        scope_id: scopeId,
        project_id: scope === "project" ? scopeId : null,
        model: chatSettings?.model ?? selectedWorkspace.default_model,
        prompt,
        temperature:
          chatSettings?.temperature ?? selectedWorkspace.default_temperature,
        context_length:
          scope === "design" || scope === "report"
            ? TIER3_CONTEXT_LENGTH
            : (chatSettings?.contextLength ??
              selectedWorkspace.default_context_length),
        embeddings_provider:
          chatSettings?.embeddingsProvider ??
          selectedWorkspace.embeddings_provider,
        include_profile_context:
          chatSettings?.includeProfileContext ??
          selectedWorkspace.include_profile_context,
        include_workspace_instructions:
          chatSettings?.includeWorkspaceInstructions ??
          selectedWorkspace.include_workspace_instructions,
        sharing: "private"
      })
      setPinnedChat(chat)
    } catch (err: any) {
      console.error("Failed to start scoped chat thread:", err)
      setStartError(
        err?.message ?? "Couldn't start the chat thread. Please try again."
      )
    } finally {
      setCreating(false)
    }
  }

  const openPinnedThread = () => {
    if (!pinnedChat || !selectedWorkspace) return
    const locale = (params.locale as string) ?? "en"
    const ws = selectedWorkspace.id
    // Pass an explicit return path so the full-screen chat's Back button comes
    // straight back HERE (the design/report/project being edited) regardless of
    // whether selectedChat has finished loading on the chat page.
    const retPath =
      scope === "design" && scopeId
        ? `/${locale}/${ws}/designs/${scopeId}`
        : scope === "report" && scopeId
          ? `/${locale}/${ws}/reports/${scopeId}`
          : scope === "project" && scopeId
            ? `/${locale}/${ws}/projects/${scopeId}`
            : ""
    const qs = retPath ? `?ret=${encodeURIComponent(retPath)}` : ""
    router.push(`/${locale}/${ws}/chat/${pinnedChat.id}${qs}`)
  }

  return (
    <div
      className={cn("text-ink bg-surface flex size-full flex-col", className)}
    >
      <div className="border-line bg-paper-2 shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-ink text-paper flex size-7 items-center justify-center rounded-md">
            <IconBrain size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-ink-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">
              {SCOPE_LABELS[scope]}
            </div>
            {scopeName && (
              <div className="text-ink truncate text-[13px] font-semibold">
                {scopeName}
              </div>
            )}
            {scopeMeta && (
              <div className="text-ink-3 truncate text-[11px]">{scopeMeta}</div>
            )}
          </div>
          {headerSlot}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {onChatRoute ? (
          <ChatUI variant="panel" />
        ) : !resolved || (creating && !startError) ? (
          <div className="text-ink-3 flex h-full items-center justify-center text-[12px]">
            {creating ? "Starting chat…" : "Loading thread…"}
          </div>
        ) : pinnedChat ? (
          <div className="flex h-full flex-col">
            <div className="border-line flex shrink-0 items-center justify-end gap-2 border-b px-3 py-1.5">
              <button
                onClick={openPinnedThread}
                title="Open thread full-screen"
                className="text-ink-3 hover:bg-paper-2 hover:text-ink flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em]"
              >
                <IconExternalLink size={11} />
                Expand
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              {/* Key on the prompt length so that when the context sync below
                  rewrites chat.prompt (design dump), ChatUI remounts and
                  re-fetches the FRESH prompt into chatSettings - otherwise it
                  keeps the stale prompt it loaded first and answers without the
                  design context. */}
              <ChatUI
                key={`${pinnedChat.id}:${(pinnedChat.prompt ?? "").length}`}
                variant="panel"
                chatId={pinnedChat.id}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <IconMessage size={28} className="text-ink-3" />
            <p className="text-ink-3 text-[12.5px]">
              {startError
                ? "Couldn't start the chat."
                : `No ${scope} chat yet.`}
            </p>
            {startError && (
              <p className="text-[11px] text-red-500">{startError}</p>
            )}
            <button
              onClick={handleStartThread}
              disabled={creating || !scopeId || !selectedWorkspace}
              className="bg-rust text-paper flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium hover:bg-[color:var(--rust-hover)] disabled:opacity-50"
            >
              <IconPlus size={12} />
              {creating
                ? "Starting…"
                : startError
                  ? "Try again"
                  : "Start thread"}
            </button>
          </div>
        )}
      </div>

      <div className="border-line bg-paper-2 shrink-0 border-t px-4 py-2">
        <div className="text-ink-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em]">
          <IconMessage size={12} />
          <span>Scoped to {scope}</span>
        </div>
      </div>
    </div>
  )
}
