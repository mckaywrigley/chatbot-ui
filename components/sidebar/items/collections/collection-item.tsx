import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { CollectionFile } from "@/types"
import { IconBooks } from "@tabler/icons-react"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import { CollectionFileSelect } from "./collection-file-select"

interface CollectionItemProps {
  collection: Tables<"collections">
}

export const CollectionItem: FC<CollectionItemProps> = ({ collection }) => {
  const [name, setName] = useState(collection.name)
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState(collection.description)

  const handleFileSelect = (
    file: CollectionFile,
    setSelectedCollectionFiles: React.Dispatch<
      React.SetStateAction<CollectionFile[]>
    >
  ) => {
    setSelectedCollectionFiles(prevState => {
      const isFileAlreadySelected = prevState.find(
        selectedFile => selectedFile.id === file.id
      )

      if (isFileAlreadySelected) {
        return prevState.filter(selectedFile => selectedFile.id !== file.id)
      } else {
        return [...prevState, file]
      }
    })
  }

  return (
    <SidebarItem
      item={collection}
      isTyping={isTyping}
      contentType="collections"
      icon={<IconBooks size={30} />}
      updateState={{
        name,
        description
      }}
      renderInputs={(renderState: {
        startingCollectionFiles: CollectionFile[]
        setStartingCollectionFiles: React.Dispatch<
          React.SetStateAction<CollectionFile[]>
        >
        selectedCollectionFiles: CollectionFile[]
        setSelectedCollectionFiles: React.Dispatch<
          React.SetStateAction<CollectionFile[]>
        >
      }) => {
        return (
          <>
            <div className="space-y-1">
              <Label>Files</Label>

              <CollectionFileSelect
                selectedCollectionFiles={
                  renderState.selectedCollectionFiles.length === 0
                    ? renderState.startingCollectionFiles
                    : [
                        ...renderState.startingCollectionFiles.filter(
                          startingFile =>
                            !renderState.selectedCollectionFiles.some(
                              selectedFile =>
                                selectedFile.id === startingFile.id
                            )
                        ),
                        ...renderState.selectedCollectionFiles.filter(
                          selectedFile =>
                            !renderState.startingCollectionFiles.some(
                              startingFile =>
                                startingFile.id === selectedFile.id
                            )
                        )
                      ]
                }
                onCollectionFileSelect={file =>
                  handleFileSelect(file, renderState.setSelectedCollectionFiles)
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Name</Label>

              <Input
                placeholder="Collection name..."
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={COLLECTION_NAME_MAX}
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>

              <Input
                placeholder="Collection description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={COLLECTION_DESCRIPTION_MAX}
              />
            </div>
          </>
        )
      }}
    />
  )
}
