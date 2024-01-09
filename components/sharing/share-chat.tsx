import { ChatbotUIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import { IconDownload, IconLock } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { WithTooltip } from "../ui/with-tooltip"
import { AddToWorkspace } from "./add-to-workspace"
import { ShareMessage } from "./share-message"

interface ShareChatProps {
  user: User | null
  chat: Tables<"chats">
  messages: Tables<"messages">[]
  username: string
}

export const ShareChat: FC<ShareChatProps> = ({
  user,
  chat,
  messages,
  username
}) => {
  const { profile } = useContext(ChatbotUIContext)

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)

  const handleDownload = () => {
    let chatData: any = {
      contentType: "chats",
      context_length: chat.context_length,
      include_profile_context: chat.include_profile_context,
      include_workspace_instructions: chat.include_workspace_instructions,
      model: chat.model,
      name: chat.name,
      prompt: chat.prompt,
      temperature: chat.temperature
    }

    let messagesData: any = messages.map(message => ({
      id: message.id,
      content: message.content,
      model: message.model,
      role: message.role,
      sequence_number: message.sequence_number
    }))

    let data: any = {
      contentType: "chats",
      chat: chatData,
      messages: messagesData
    }

    const element = document.createElement("a")
    const file = new Blob([JSON.stringify(data)], {
      type: "text/plain"
    })
    element.href = URL.createObjectURL(file)
    element.download = `${data.name}.json`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <Card className="md:w-[600px] lg:w-[700px] xl:w-[800px]">
      <CardHeader className="space-y-2">
        <CardDescription>
          {user?.id === profile?.user_id && user
            ? `You created this chat`
            : `Chat created by ${username || "Anonymous"}`}
        </CardDescription>

        <CardTitle className="text-2xl">{chat.name}</CardTitle>
      </CardHeader>

      <CardContent className="max-h-[500px] overflow-auto pb-0">
        {messages.map(message => (
          <ShareMessage
            key={message.id}
            username={username}
            message={message}
          />
        ))}
      </CardContent>

      <CardFooter className="mt-6">
        {(user?.id !== profile?.user_id || !user) && (
          <DropdownMenu
            open={showWorkspaceMenu}
            onOpenChange={open => setShowWorkspaceMenu(open)}
          >
            <DropdownMenuTrigger
              className="mt-1"
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              disabled={!user?.id}
            >
              <WithTooltip
                delayDuration={!user?.id ? 0 : 1000}
                display={
                  <div>
                    {!user?.id
                      ? `Sign up for Chatbot UI to continue this chat.`
                      : "Continue this chat in a workspace."}
                  </div>
                }
                trigger={
                  <Button disabled={!user?.id}>
                    {!user?.id && <IconLock className="mr-1" />}
                    Continue Chat
                  </Button>
                }
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <AddToWorkspace contentType="chats" item={chat} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="ml-auto">
          <WithTooltip
            display={<div>Export</div>}
            trigger={
              <IconDownload
                className="cursor-pointer hover:opacity-50"
                onClick={handleDownload}
              />
            }
          />
        </div>
      </CardFooter>
    </Card>
  )
}
