import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"

export const uploadAssistantImage = async (
  assistant: Tables<"assistants">,
  image: File
) => {
  const bucket = "assistant_images"

  const imageSizeLimit = 6000000 // 6MB

  if (image.size > imageSizeLimit) {
    throw new Error(`Image must be less than ${imageSizeLimit / 1000000}MB`)
  }

  const currentPath = assistant.image_path
  let filePath = `${assistant.user_id}/${assistant.id}/${Date.now()}`

  if (currentPath.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([currentPath])

    if (deleteError) {
      throw new Error("Error deleting old image")
    }
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, image, {
      upsert: true
    })

  if (error) {
    throw new Error("Error uploading image")
  }

  return filePath
}

export const getAssistantImageFromStorage = async (filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from("assistant_images")
      .createSignedUrl(filePath, 60 * 60 * 24) // 24hrs

    if (error) {
      throw new Error("Error downloading assistant image")
    }

    return data.signedUrl
  } catch (error) {
    console.error(error)
  }
}
