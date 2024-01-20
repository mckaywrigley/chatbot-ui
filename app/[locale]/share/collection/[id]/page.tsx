"use client"

import { ShareCollection } from "@/components/sharing/share-collection"
import { ShareHeader } from "@/components/sharing/share-header"
import { ScreenLoader } from "@/components/ui/screen-loader"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { getCollectionById } from "@/db/collections"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import { CollectionFile } from "@/types"
import { useEffect, useState } from "react"

interface ShareCollectionPageProps {
  params: {
    id: string
  }
}

export default function ShareCollectionPage({
  params
}: ShareCollectionPageProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [collection, setCollection] = useState<Tables<"collections"> | null>(
    null
  )
  const [collectionFiles, setCollectionFiles] = useState<CollectionFile[]>([])

  const onLoad = async () => {
    const session = (await supabase.auth.getSession()).data.session

    setSession(session)

    const fetchedCollection = await getCollectionById(params.id)
    setCollection(fetchedCollection)

    if (!fetchedCollection) {
      setLoading(false)
      return
    }

    const fetchedCollectionFiles = await getCollectionFilesByCollectionId(
      fetchedCollection.id
    )
    setCollectionFiles(fetchedCollectionFiles.files)

    setLoading(false)
  }

  useEffect(() => {
    onLoad()
  }, [])

  if (loading) {
    return <ScreenLoader />
  }

  if (!collection) {
    return (
      <div className="flex size-full items-center justify-center text-4xl">
        Collection not found.
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col p-4">
      <ShareHeader session={session} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ShareCollection user={session?.user} collection={collection} />
      </div>
    </div>
  )
}
