"use client"

import { ShareHeader } from "@/components/sharing/share-header"
import { ScreenLoader } from "@/components/ui/screen-loader"
import { supabase } from "@/lib/supabase/browser-client"
import { ContentType, DataItemType } from "@/types"
import { FC, useEffect, useState } from "react"

interface SharePageProps {
  contentType: ContentType
  id: string
  fetchById: (id: string) => Promise<DataItemType>
  ViewComponent: FC<any>
}

export default function SharePage({
  contentType,
  id,
  fetchById,
  ViewComponent
}: SharePageProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<any | null>(null)

  const onLoad = async () => {
    const session = (await supabase.auth.getSession()).data.session

    setSession(session)

    const fetchedItem = await fetchById(id)
    setItem(fetchedItem)

    if (!fetchedItem) {
      setLoading(false)
      return
    }

    setLoading(false)
  }

  useEffect(() => {
    onLoad()
  }, [])

  const itemProps = { [contentType.slice(0, -1)]: item }

  if (loading) {
    return <ScreenLoader />
  }

  if (!item) {
    return (
      <div className="flex size-full items-center justify-center text-4xl">
        {contentType.slice(0, -1).charAt(0).toUpperCase() +
          contentType.slice(1, -1)}{" "}
        not found.
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col p-4">
      {<ShareHeader session={session} />}

      <div className="flex flex-1 flex-col items-center justify-center">
        <ViewComponent user={session?.user} {...itemProps} username="" />
      </div>
    </div>
  )
}
