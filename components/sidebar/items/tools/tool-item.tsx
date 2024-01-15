import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { TOOL_DESCRIPTION_MAX, TOOL_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { IconBolt } from "@tabler/icons-react"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"

interface ToolItemProps {
  tool: Tables<"tools">
}

export const ToolItem: FC<ToolItemProps> = ({ tool }) => {
  const [name, setName] = useState(tool.name)
  const [description, setDescription] = useState(tool.description)
  const [url, setUrl] = useState(tool.url)
  const [schema, setSchema] = useState(tool.schema as string)

  return (
    <SidebarItem
      item={tool}
      contentType="tools"
      icon={<IconBolt size={30} />}
      updateState={{ name, description, url, schema }}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Tool name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={TOOL_NAME_MAX}
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>

            <Input
              placeholder="Tool description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={TOOL_DESCRIPTION_MAX}
            />
          </div>

          <div className="space-y-1">
            <Label>URL</Label>

            <Input
              placeholder="Tool url..."
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Schema</Label>

            <TextareaAutosize
              placeholder={`paths": {
                "/location": {
                  "get": {
                    "description": "Get temperature for a specific location",
                    "operationId": "GetCurrentWeather",
                    "parameters": [
                      {
                        "name": "location",
                        "in": "query",
                        "description": "The city and state to retrieve the weather for",
                        "required": true,
                        "schema": {
                          "type": "string"
                        }
                      }
                    ],
                    "deprecated": false
                  }
                }
              },`}
              value={schema}
              onValueChange={setSchema}
              minRows={20}
            />
          </div>
        </>
      )}
    />
  )
}
