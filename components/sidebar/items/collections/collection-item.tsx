import ImagePicker from "@/components/ui/image-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { CollectionFile } from "@/types"
import { IconBooks } from "@tabler/icons-react"
import { FC, useEffect, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import { CollectionFilePicker } from "./collection-file-picker"

interface CollectionItemProps {
  collection: Tables<"collections">
}

export const CollectionItem: FC<CollectionItemProps> = ({ collection }) => {
  const [name, setName] = useState(collection.name)
  const [description, setDescription] = useState(collection.description)
  const [selectedCollectionFiles, setSelectedCollectionFiles] = useState<
    CollectionFile[]
  >([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageLink, setImageLink] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      const collectionFiles = await getCollectionFilesByCollectionId(
        collection.id
      )
      const files = collectionFiles.files
      setSelectedCollectionFiles(files)
    }

    fetchData()
  }, [])

  const handleFileSelect = (file: CollectionFile) => {
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
      contentType="collections"
      icon={<IconBooks size={30} />}
      updateState={{
        image: selectedImage,
        collectionFilesToAdd: [],
        collectionFilesToRemove: [],
        name,
        description
      }}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Files</Label>

            <CollectionFilePicker
              selectedCollectionFiles={selectedCollectionFiles}
              onCollectionFileSelect={handleFileSelect}
            />
          </div>

          <div className="space-y-1">
            <Label>Image</Label>

            <ImagePicker
              src={imageLink}
              image={selectedImage}
              onSrcChange={setImageLink}
              onImageChange={setSelectedImage}
              width={100}
              height={100}
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
      )}
    />
  )
}
