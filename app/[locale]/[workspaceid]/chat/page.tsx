"use client"

/**
 * Workspace-level "/chat" landing.
 *
 * Chat is experiment-design focused: a chat here always talks to ALL of your
 * designs (retrieve.ts treats a design-scope chat with an empty scope_id as
 * "every design in the workspace"). There is no scope picker any more - the
 * single action starts an all-designs thread. Per-design chat lives on the
 * design page itself (the side rail).
 *
 * The "Start chat" button on the Designs list routes here with
 * `?defaultScope=designs`, which auto-starts the thread. If creation fails we
 * surface an error with a Retry button rather than spinning forever (the
 * previous version left an infinite spinner when createChat threw).
 */
import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatUI } from "@/components/chat/chat-ui"
import { createChat } from "@/db/chats"
import { Brand } from "@/components/ui/brand"
import { Button } from "@/components/ui/button"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { supabase } from "@/lib/supabase/browser-client"
import { useToast } from "@/app/hooks/use-toast"
import { IconAlertTriangle, IconFlask } from "@tabler/icons-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useContext, useEffect, useRef, useState } from "react"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())

  const router = useRouter()
  const params = useParams() as { locale: string; workspaceid: string }
  const searchParams = useSearchParams()
  const { chatMessages, profile, selectedWorkspace, chatSettings } =
    useContext(ChatbotUIContext)
  const { toast } = useToast()

  const { handleNewChat } = useChatHandler()

  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? ""

  const [creating, setCreating] = useState(false)
  const [autoStartError, setAutoStartError] = useState<string | null>(null)

  // Creates (and routes to) a thread scoped to ALL designs in the workspace.
  // scope_id is left null - retrieve.ts treats that as "every design".
  const startAllDesignsChat = async () => {
    if (!selectedWorkspace) return
    setCreating(true)
    setAutoStartError(null)
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")

      const chat = await createChat({
        user_id: user.id,
        workspace_id: selectedWorkspace.id,
        name: "All designs chat",
        scope: "design",
        scope_id: null,
        project_id: null,
        model: chatSettings?.model ?? selectedWorkspace.default_model,
        prompt: chatSettings?.prompt ?? selectedWorkspace.default_prompt ?? "",
        temperature:
          chatSettings?.temperature ?? selectedWorkspace.default_temperature,
        context_length:
          chatSettings?.contextLength ??
          selectedWorkspace.default_context_length,
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
      router.replace(`/${params.locale}/${params.workspaceid}/chat/${chat.id}`)
    } catch (err: any) {
      const message = err?.message ?? "Try again."
      setAutoStartError(message)
      toast({
        title: "Couldn't start chat",
        description: message,
        variant: "destructive"
      })
      setCreating(false)
    }
    // Note: on success we intentionally leave `creating` true - the page is
    // navigating away, so flipping it back would just flash the launcher.
  }

  // Auto-start when arriving from the Designs "Start chat" button. Guarded so
  // it fires once; the error state (not an infinite spinner) handles failures.
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (autoStartedRef.current) return
    if (!searchParams.get("defaultScope")) return
    if (!selectedWorkspace || !profile) return
    autoStartedRef.current = true
    void startAllDesignsChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, selectedWorkspace?.id, profile?.user_id])

  if (chatMessages.length > 0) {
    return <ChatUI />
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-2">
        <ChatHelp />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <Brand />

        {autoStartError ? (
          <div className="mt-8 max-w-md">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-red-50">
              <IconAlertTriangle size={24} className="text-red-500" />
            </div>
            <p className="text-ink text-[15px] font-medium">
              Couldn&apos;t start the chat
            </p>
            <p className="text-ink-3 mt-1 text-[13px]">{autoStartError}</p>
            <Button
              variant="primary"
              size="lg"
              className="mt-5"
              onClick={() => void startAllDesignsChat()}
              disabled={creating || !selectedWorkspace}
            >
              {creating ? "Retrying…" : "Retry"}
            </Button>
          </div>
        ) : creating || searchParams.get("defaultScope") ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="border-line border-t-rust size-8 animate-spin rounded-full border-2" />
            <p className="text-ink-3 text-[13px]">
              Starting chat with all your designs…
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {firstName && (
              <p className="text-ink-3 text-[13px]">Hi {firstName},</p>
            )}
            <p className="text-ink mt-0.5 text-[15px] font-medium sm:text-[16px]">
              Chat across all your designs
            </p>
            <p className="text-ink-3 mx-auto mt-2 max-w-md text-[13px]">
              Ask questions about your experiment designs - answers are
              retrieved from your designs and cite their source.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="mt-6 gap-2"
              onClick={() => void startAllDesignsChat()}
              disabled={creating || !selectedWorkspace}
            >
              <IconFlask size={16} />
              Start chat with all designs
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
