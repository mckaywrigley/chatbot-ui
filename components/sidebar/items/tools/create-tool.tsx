import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { ChatbotUIContext } from "@/context/context"
import { TOOL_DESCRIPTION_MAX, TOOL_NAME_MAX } from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useState } from "react"

interface CreateToolProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateTool: FC<CreateToolProps> = ({ isOpen, onOpenChange }) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)

  const [name, setName] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [customHeaders, setCustomHeaders] = useState("")
  const [schema, setSchema] = useState("")
  const [isRequestInBody, setIsRequestInBody] = useState(true)

  if (!profile || !selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="tools"
      createState={
        {
          user_id: profile.user_id,
          name,
          description,
          url,
          custom_headers: customHeaders,
          schema,
          request_in_body: isRequestInBody
        } as TablesInsert<"tools">
      }
      isOpen={isOpen}
      isTyping={isTyping}
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

          {/* <div className="space-y-1">
            <Label>URL</Label>

            <Input
              placeholder="Tool url..."
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div> */}

          {/* <div className="space-y-3 pt-4 pb-3">
            <div className="space-x-2 flex items-center">
              <Checkbox />

              <Label>Web Browsing</Label>
            </div>

            <div className="space-x-2 flex items-center">
              <Checkbox />

              <Label>Image Generation</Label>
            </div>

            <div className="space-x-2 flex items-center">
              <Checkbox />

              <Label>Code Interpreter</Label>
            </div>
          </div> */}

          <div className="space-y-1">
            <Label>Custom Headers</Label>

            <TextareaAutosize
              placeholder={`{"X-api-key": "1234567890"}`}
              value={customHeaders}
              onValueChange={setCustomHeaders}
              minRows={1}
            />
          </div>

          <div className="space-y-1">
            <Label>Schema</Label>

            <TextareaAutosize
              placeholder={`{
                "openapi": "3.1.0",
                "info": {
                  "title": "Get weather data",
                  "description": "Retrieves current weather data for a location.",
                  "version": "v1.0.0"
                },
                "servers": [
                  {
                    "url": "https://weather.example.com"
                  }
                ],
                "paths": {
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
                },
                "components": {
                  "schemas": {}
                }
              }`}
              value={schema}
              onValueChange={setSchema}
              minRows={15}
            />
          </div>

          <div className="space-y-1">
            <Label>Request in...</Label>

            <Tabs
              defaultValue={isRequestInBody ? "body" : "url"}
              className="w-[400px]"
            >
              <TabsList>
                <TabsTrigger
                  value="body"
                  onClick={() => setIsRequestInBody(true)}
                >
                  Body
                </TabsTrigger>
                <TabsTrigger
                  value="url"
                  onClick={() => setIsRequestInBody(false)}
                >
                  URL
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </>
      )}
      onOpenChange={onOpenChange}
    />
  )
}
