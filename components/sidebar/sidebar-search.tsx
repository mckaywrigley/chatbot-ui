import { ContentType } from "@/types"
import { FC } from "react"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCoffee, faSearch } from "@fortawesome/free-solid-svg-icons"

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
  return (
    <div className="bg-pixelspace-gray-60 flex h-[42px] items-center rounded-md p-3">
      <div>
        <FontAwesomeIcon className="text-pixelspace-gray-20" icon={faSearch} />
      </div>
      <Input
        placeholder={`Search ${contentType === "chats" ? "threads" : contentType}...`}
        className="bg-pixelspace-gray-60"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
    </div>
  )
}
