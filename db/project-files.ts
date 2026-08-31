import { supabase } from "@/lib/supabase/browser-client"

export interface ProjectFileMeta {
  id: string
  project_id: string
  workspace_id: string
  user_id: string
  name: string
  mime_type: string
  size: number
  storage_path: string
  created_at: string
}

// File types accepted by the project Files tab. Mirrors the input's
// `accept` attribute (studio-canvas.tsx) - keep these two in sync.
//   PDF, JPG/JPEG/PNG/WebP/GIF images, CSV, and Word .docx (#15).
const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/csv",
  "application/vnd.ms-excel", // some browsers tag csv as this
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword" // legacy .doc - accept upload, content extraction tbd
]

const ACCEPTED_EXT = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".csv",
  ".docx",
  ".doc"
]

const isAccepted = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  if (ACCEPTED_MIME.includes(file.type)) return true
  return ACCEPTED_EXT.some(ext => lowerName.endsWith(ext))
}

export const getProjectFiles = async (
  projectId: string
): Promise<ProjectFileMeta[]> => {
  const res = await fetch(
    `/api/project-files?projectId=${encodeURIComponent(projectId)}`,
    { cache: "no-store" }
  )
  if (!res.ok) {
    if (res.status === 401) return []
    throw new Error(`Failed to fetch project files (${res.status})`)
  }
  const json = await res.json()
  return (json.files ?? []) as ProjectFileMeta[]
}

export const uploadProjectFile = async (params: {
  file: File
  projectId: string
  workspaceId: string
  userId: string
}): Promise<ProjectFileMeta> => {
  const { file, projectId, workspaceId, userId } = params

  if (!isAccepted(file)) {
    throw new Error(
      `Unsupported file type. Upload PDF, JPEG/PNG/WebP/GIF, CSV, or DOCX.`
    )
  }

  const SIZE_LIMIT = parseInt(
    process.env.NEXT_PUBLIC_USER_FILE_SIZE_LIMIT || "10000000"
  )
  if (file.size > SIZE_LIMIT) {
    throw new Error(
      `File must be less than ${Math.floor(SIZE_LIMIT / 1000000)} MB`
    )
  }

  const fileId = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${userId}/projects/${projectId}/${fileId}-${safeName}`

  console.log("[uploadProjectFile] storage.upload starting", {
    bucket: "files",
    storagePath,
    size: file.size,
    type: file.type
  })

  const { error: uploadError } = await supabase.storage
    .from("files")
    .upload(storagePath, file, { upsert: false })

  if (uploadError) {
    console.error("[uploadProjectFile] storage.upload failed", uploadError)
    // Surface the specific Supabase error message - common ones:
    //  • "Bucket not found"  → `files` bucket doesn't exist
    //  • "new row violates row-level security policy" → storage RLS
    //    policies on storage.objects don't allow the user's path
    //  • "The resource already exists" → duplicate path (rare w/ uuid)
    throw new Error(
      `Storage upload failed: ${uploadError.message || "unknown error"}`
    )
  }

  console.log("[uploadProjectFile] storage OK; POSTing metadata")

  const res = await fetch(`/api/project-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: fileId,
      project_id: projectId,
      workspace_id: workspaceId,
      name: file.name,
      mime_type: file.type || "application/octet-stream",
      size: file.size,
      storage_path: storagePath
    })
  })

  if (!res.ok) {
    // Roll back the upload on metadata failure so we don't leak orphan objects.
    await supabase.storage.from("files").remove([storagePath])
    const body = await res.json().catch(() => null)
    const msg =
      body?.detail ||
      body?.error ||
      `Failed to save file metadata (${res.status})`
    console.error("[uploadProjectFile] metadata POST failed", res.status, body)
    throw new Error(msg)
  }

  return (await res.json()) as ProjectFileMeta
}

export const deleteProjectFile = async (
  fileId: string,
  storagePath: string
): Promise<void> => {
  await supabase.storage.from("files").remove([storagePath])
  const res = await fetch(`/api/project-files/${encodeURIComponent(fileId)}`, {
    method: "DELETE"
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete file (${res.status})`)
  }
}

export const getProjectFileSignedUrl = async (
  storagePath: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUrl(storagePath, 60 * 60)
  if (error || !data) {
    throw new Error("Unable to create download link")
  }
  return data.signedUrl
}
