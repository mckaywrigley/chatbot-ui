import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import Link from "next/link"
import { FC } from "react"
import { formatFileSize } from "../sidebar/items/files/file-item"
import { ShareItem } from "./share-item"

interface ShareFileProps {
  user: User | null
  file: Tables<"files">
  link: string
}

export const ShareFile: FC<ShareFileProps> = ({ user, file, link }) => {
  return (
    <ShareItem
      user={user}
      item={file}
      contentType="files"
      renderContent={() => (
        <>
          <div>{file.name}</div>

          <Link
            className="cursor-pointer underline hover:opacity-50"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
          >
            View
          </Link>

          <div className="flex justify-between">
            <div>{file.type}</div>

            <div>{formatFileSize(file.size)}</div>

            <div>{file.tokens.toLocaleString()} tokens</div>
          </div>
        </>
      )}
    />
  )
}
