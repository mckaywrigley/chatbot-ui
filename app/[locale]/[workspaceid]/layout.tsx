import { getAssistants } from "@/actions/assistants"
import { getChats } from "@/actions/chats"
import { getCollections } from "@/actions/collections"
import { getFiles } from "@/actions/files"
import { getFolders } from "@/actions/folders"
import { getModels } from "@/actions/models"
import { getPresets } from "@/actions/presets"
import { getProfile } from "@/actions/profiles"
import { getPrompts } from "@/actions/prompts"
import { getTools } from "@/actions/tools"
import { getWorkspaces } from "@/actions/workspaces"
import { Dashboard } from "@/components/ui/dashboard"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ReactNode } from "react"

interface WorkspaceLayoutProps {
  children: ReactNode
  params: {
    workspaceid: string
  }
}

export default async function WorkspaceLayout({
  children,
  params
}: WorkspaceLayoutProps) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return redirect("/login")
  }

  const profile = await getProfile(data.user.id)
  const workspaces = await getWorkspaces(data.user.id)

  const workspaceId = params.workspaceid as string

  // Workspace data
  const assistants = await getAssistants(workspaceId)
  const chats = await getChats(workspaceId)
  const collections = await getCollections(workspaceId)
  const folders = await getFolders(workspaceId)
  const files = await getFiles(workspaceId)
  const presets = await getPresets(workspaceId)
  const prompts = await getPrompts(workspaceId)
  const tools = await getTools(workspaceId)
  const models = await getModels(workspaceId)

  // Image data
  const workspaceImages = []
  const assistantImages = []

  return (
    <Dashboard
      assistants={assistants}
      chats={chats}
      collections={collections}
      folders={folders}
      files={files}
      presets={presets}
      profile={profile}
      prompts={prompts}
      tools={tools}
      models={models}
      workspaces={workspaces}
    >
      {children}
    </Dashboard>
  )
}
