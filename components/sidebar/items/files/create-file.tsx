import { ACCEPTED_FILE_TYPES } from "@/components/chat/chat-hooks/use-select-file-handler"
import { SidebarCreateItem } from "@/components/sidebar/items/all/sidebar-create-item"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { FILE_DESCRIPTION_MAX, FILE_NAME_MAX } from "@/db/limits"
import { TablesInsert } from "@/supabase/types"
import { FC, useContext, useState } from "react"

interface CreateFileProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export const CreateFile: FC<CreateFileProps> = ({ isOpen, onOpenChange }) => {
  const { profile, selectedWorkspace } = useContext(ChatbotUIContext)

  const [name, setName] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleSelectedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const file = e.target.files[0]

    if (!file) return

    setSelectedFile(file)
    const fileNameWithoutExtension = file.name.split(".").slice(0, -1).join(".")
    setName(fileNameWithoutExtension)
  }

  if (!profile) return null
  if (!selectedWorkspace) return null

  return (
    <SidebarCreateItem
      contentType="files"
      createState={
        {
          file: selectedFile,
          user_id: profile.user_id,
          name,
          description,
          file_path: "",
          size: selectedFile?.size || 0,
          tokens: 0,
          type: selectedFile?.type || 0
        } as TablesInsert<"files">
      }
      isOpen={isOpen}
      isTyping={isTyping}
      onOpenChange={onOpenChange}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>File</Label>

            <div
              role="button"
              className={`bg-pixelspace-gray-70 border-pixelspace-gray-50  focus:border-pixelspace-gray-40 text-pixelspace-gray-20 flex h-[42px] cursor-pointer items-center rounded-sm border px-3`}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              <span className="hover:text-pixelspace-gray-3 font-['Libre Franklin'] mr-3 text-sm font-normal leading-[25.20px]">
                Choose files
              </span>
              {!selectedFile ? (
                <span className="font-['Libre Franklin'] text-sm font-normal leading-[25.20px]">
                  no filed selected
                </span>
              ) : (
                name
              )}
            </div>
            <input
              type="file"
              id="fileInput"
              className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 h-[42px] border`}
              onChange={handleSelectedFile}
              accept={ACCEPTED_FILE_TYPES}
              style={{ display: "none" }} // Hace que el cursor sea un puntero sobre el área del input
            />
          </div>

          <div style={{ marginTop: 22 }}>
            <Label>Name</Label>

            <Input
              className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 h-[42px] border`}
              placeholder="File name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={FILE_NAME_MAX}
            />
          </div>

          <div style={{ marginTop: 22 }}>
            <Label>Description</Label>

            <Input
              className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 h-[42px] border`}
              placeholder="File description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={FILE_DESCRIPTION_MAX}
            />
          </div>
        </>
      )}
    />
  )
}
