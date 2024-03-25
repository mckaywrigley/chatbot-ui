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
  return (
    <div className="bg-pixelspace-gray-50 flex h-[42px] w-full items-center rounded-md px-2 py-3">
      <div>
        <i
          className="fa-regular fa-magnifying-glass text-pixelspace-gray-20"
          style={{ width: 16, height: 16 }}
        ></i>
      </div>
      <Input
        placeholder={`Find ${contentType === "chats" ? "threads" : contentType}`}
        className="bg-pixelspace-gray-50 text-pixelspace-gray-20 text-sm font-normal"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
    </div>
  )
}
