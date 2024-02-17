import { getAssistants } from "@/actions/assistants"
import { getCollections } from "@/actions/collections"
import { getFiles } from "@/actions/files"
import { getMessages } from "@/actions/messages"
import { getModels } from "@/actions/models"
import { getPresets } from "@/actions/presets"
import { getPrompts } from "@/actions/prompts"
import { getTools } from "@/actions/tools"
import { ChatHelp } from "@/components/chat/chat-help"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatSettings } from "@/components/chat/chat-settings"
import { ChatUI } from "@/components/chat/chat-ui"
import { QuickSettings } from "@/components/chat/quick-settings"
import { Brand } from "@/components/ui/brand"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ReactNode } from "react"

interface ChatPageProps {
  children: ReactNode
  params: {
    workspaceid: string
    chatid: string
  }
}

export default async function ChatPage({ children, params }: ChatPageProps) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return redirect("/login")
  }

  console.log("params", params)
  const workspaceId = params.workspaceid as string
  const chatId = params.chatid as string

  const assistants = await getAssistants(workspaceId)
  const messages = await getMessages(workspaceId)
  const models = await getModels(workspaceId)
  const presets = await getPresets(workspaceId)
  const prompts = await getPrompts(workspaceId)
  const files = await getFiles(workspaceId)
  const collections = await getCollections(workspaceId)
  const tools = await getTools(workspaceId)

  return (
    <>
      {messages.length === 0 ? (
        <div className="relative flex h-full flex-col items-center justify-center">
          <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-20">
            <Brand />
          </div>

          <div className="absolute left-2 top-2">
            <QuickSettings presets={presets} assistants={assistants} />
          </div>

          <div className="absolute right-2 top-2">
            <ChatSettings models={models} />
          </div>

          <div className="flex grow flex-col items-center justify-center" />

          <div className="w-[300px] pb-8 sm:w-[400px] md:w-[500px] lg:w-[660px] xl:w-[800px]">
            <ChatInput
              prompts={prompts}
              assistants={assistants}
              files={files}
              collections={collections}
              tools={tools}
            />
          </div>

          <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
            <ChatHelp />
          </div>
        </div>
      ) : (
        <ChatUI
          prompts={prompts}
          assistants={assistants}
          files={files}
          collections={collections}
          tools={tools}
        />
      )}
    </>
  )
}
