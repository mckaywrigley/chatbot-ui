import { getAssistants } from "@/actions/assistants"
import { getCollections } from "@/actions/collections"
import { getFiles } from "@/actions/files"
import { getModels } from "@/actions/models"
import { getProfile } from "@/actions/profiles"
import { getPrompts } from "@/actions/prompts"
import { getTools } from "@/actions/tools"
import { ChatUI } from "@/components/chat/chat-ui"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ChatIdPage({ children, params }: any) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return redirect("/login")
  }

  const workspaceId = params.workspaceid as string
  const chatId = params.chatid as string

  const profile = await getProfile(data.user.id)
  const assistants = await getAssistants(workspaceId)
  const prompts = await getPrompts(workspaceId)
  const files = await getFiles(workspaceId)
  const collections = await getCollections(workspaceId)
  const tools = await getTools(workspaceId)
  const models = await getModels(workspaceId)

  return (
    <ChatUI
      workspaceId={workspaceId}
      profile={profile}
      models={models}
      prompts={prompts}
      assistants={assistants}
      files={files}
      collections={collections}
      tools={tools}
    />
  )
}
