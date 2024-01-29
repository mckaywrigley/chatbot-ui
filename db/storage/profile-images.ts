import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"

export const uploadProfileImage = async (
  profile: Tables<"profiles">,
  image: File
) => {
  const bucket = "profile_images"

  const imageSizeLimit = 2000000 // 2MB

  if (image.size > imageSizeLimit) {
    throw new Error(`Image must be less than ${imageSizeLimit / 1000000}MB`)
  }

  const currentPath = profile.image_path
  let filePath = `${profile.user_id}/${Date.now()}`

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

  const { data: getPublicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return {
    path: filePath,
    url: getPublicUrlData.publicUrl
  }
}
