import { Tables } from "@/supabase/types"
import { User } from "@supabase/supabase-js"
import { FC } from "react"
import { ShareItem } from "./share-item"

interface ShareCollectionProps {
  user: User | null
  collection: Tables<"collections">
}

export const ShareCollection: FC<ShareCollectionProps> = ({
  user,
  collection
}) => {
  return (
    <ShareItem
      user={user}
      item={collection}
      contentType="collections"
      renderContent={() => <div>{collection.name}</div>}
    />
  )
}
