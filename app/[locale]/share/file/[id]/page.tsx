"use client"

import { ShareFile } from "@/components/sharing/share-file"
import { ShareHeader } from "@/components/sharing/share-header"
import { ScreenLoader } from "@/components/ui/screen-loader"
import { getFileById } from "@/db/files"
import { getFileFromStorage } from "@/db/storage/files"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import { useEffect, useState } from "react"

interface ShareFilePageProps {
  params: {
    id: string
  }
}

export default function ShareFilePage({ params }: ShareFilePageProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<Tables<"files"> | null>(null)
  const [link, setLink] = useState("")

  const onLoad = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session

      setSession(session)

      const fetchedFile = await getFileById(params.id)
      setFile(fetchedFile)

      if (!fetchedFile) {
        setLoading(false)
        return
      }

      const fileLink = await getFileFromStorage(fetchedFile.file_path)
      setLink(fileLink)

      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  useEffect(() => {
    onLoad()
  }, [])

  if (loading) {
    return <ScreenLoader />
  }

  if (!file) {
    return (
      <div className="flex size-full items-center justify-center text-4xl">
        File not found.
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col p-4">
      <ShareHeader session={session} />

      <div className="flex flex-1 flex-col items-center justify-center">
        <ShareFile user={session?.user} file={file} link={link} />
      </div>
    </div>
  )
}
