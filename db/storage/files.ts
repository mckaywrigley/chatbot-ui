import { supabase } from "@/lib/supabase/browser-client"
import { toast } from "sonner"

export const uploadFile = async (
  file: File,
  payload: {
    name: string
    user_id: string
    file_id: string
  }
) => {
  const SIZE_LIMIT = 10000000 // 10MB

  if (file.size > SIZE_LIMIT) {
    throw new Error(`File must be less than ${SIZE_LIMIT / 1000000}MB`)
  }

  const filePath = `${payload.user_id}/${Buffer.from(payload.file_id).toString("base64")}`

  const { error } = await supabase.storage
    .from("files")
    .upload(filePath, file, {
      upsert: true
    })

  if (error) {
    console.error(`Error uploading file with path: ${filePath}`, error)
    throw new Error("Error uploading file")
  }

  return filePath
}

export const deleteFileFromStorage = async (filePath: string) => {
  const { error } = await supabase.storage.from("files").remove([filePath])

  if (error) {
    toast.error("Failed to remove file!")
    return
  }
}

export const getFileFromStorage = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUrl(filePath, 60 * 60 * 24) // 24hrs

  if (error) {
    throw new Error("Error downloading file")
  }

  return data.signedUrl
}

export const copyFileImagePath = async (filePath: string, userId: string) => {
  const newFilePath = replaceFirstId(filePath, userId)
  const { data, error } = await supabase.storage
    .from("message_images")
    .copy(filePath, newFilePath) // 24hrs

  if (error) {
    console.log("error", error)
    throw new Error("Error downloading file")
  }

  return data.path
}

function replaceFirstId(originalString: string, newId: string): string {
  // Split the string using "/"
  const parts = originalString.split("/")

  // Replace the first element with the new ID
  parts[0] = newId

  // Join the parts back into a string with "/"
  const updatedString = parts.join("/")

  return updatedString
}
