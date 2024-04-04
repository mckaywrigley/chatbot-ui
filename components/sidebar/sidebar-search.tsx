import { ContentType } from "@/types"
import { FC } from "react"
import { Input } from "../ui/input"

interface SidebarSearchProps {
  contentType: ContentType
  searchTerm: string
  setSearchTerm: Function
}

export const SidebarSearch: FC<SidebarSearchProps> = ({
  contentType,
  searchTerm,
  setSearchTerm
}) => {
  let placeHolderText
  if (contentType === "chats") {
    placeHolderText = "Search topic names..."
  } else {
    placeHolderText = `Search ${contentType}...`
  }
  return (
    <Input
      placeholder={placeHolderText}
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
    />
  )
}
