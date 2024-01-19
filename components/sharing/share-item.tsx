import Loading from "@/app/[locale]/loading"
import { ContentType } from "@/types"
import { User } from "@supabase/supabase-js"
import { IconDownload, IconLock } from "@tabler/icons-react"
import { FC, ReactNode, useEffect, useState } from "react"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader
} from "../ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { WithTooltip } from "../ui/with-tooltip"
import { AddToWorkspace } from "./add-to-workspace"

interface ShareItemProps {
  user: User | null
  item: any // DataItemType
  contentType: ContentType
  renderContent: () => ReactNode
}

export const ShareItem: FC<ShareItemProps> = ({
  user,
  item,
  contentType,
  renderContent
}) => {
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const response = await fetch("/api/username/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: item.user_id })
      })

      const data = await response.json()
      setUsername(data.username)

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleExport = () => {
    let data: any = {
      contentType: contentType
    }

    switch (contentType) {
      case "presets":
        data = {
          ...data,
          context_length: item.context_length,
          description: item.description,
          include_profile_context: item.include_profile_context,
          include_workspace_instructions: item.include_workspace_instructions,
          model: item.model,
          name: item.name,
          prompt: item.prompt,
          temperature: item.temperature
        }
        break

      case "prompts":
        data = {
          ...data,
          content: item.content,
          name: item.name
        }
        break

      case "files":
        data = {
          ...data,
          name: item.name
        }
        break

      case "collections":
        data = {
          ...data,
          name: item.name
        }
        break

      case "assistants":
        data = {
          ...data,
          name: item.name
        }
        break

      case "tools":
        data = {
          ...data,
          name: item.name
        }
        break

      default:
        break
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

  if (loading) {
    return <Loading />
  }

  return (
    <Card className="w-[600px]">
      <CardHeader className="space-y-2 pb-4">
        <CardDescription>
          {user?.id === item?.user_id && user
            ? `You created this ${contentType.slice(0, -1)}`
            : `${
                contentType.charAt(0).toUpperCase() + contentType.slice(1, -1)
              } created by ${username || "Anonymous"}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="max-h-[500px] overflow-auto pb-0">
        {renderContent()}
      </CardContent>

      <CardFooter className="mt-6">
        {(user?.id !== item?.user_id || !user) && (
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
                      ? `Sign up for Chatbot UI to continue this ${contentType.slice(
                          0,
                          -1
                        )}.`
                      : `Use this ${contentType.slice(0, -1)} in a workspace.`}
                  </div>
                }
                trigger={
                  <Button disabled={!user?.id}>
                    {!user?.id && <IconLock className="mr-1" />}
                    {`Use ${contentType.slice(0, -1)}`}
                  </Button>
                }
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <AddToWorkspace contentType={contentType} item={item} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="ml-auto">
          <WithTooltip
            display={<div>Export</div>}
            trigger={
              <IconDownload
                className="cursor-pointer hover:opacity-50"
                onClick={handleExport}
              />
            }
          />
        </div>
      </CardFooter>
    </Card>
  )
}
