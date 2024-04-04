import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import { getServerProfile } from "@/lib/server/server-chat-helpers"

export async function POST(req: Request) {
  const json = await req.json()
  const { fileId } = json as {
    fileId: string
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    const { data: userFile, error: userFileError } = await supabaseAdmin
      .from("files")
      .select("id")
      .eq("id", fileId)
      .eq("user_id", profile.user_id)

    if (userFileError) {
      throw new Error(`Failed to retrieve user file: ${userFileError.message}`)
    }

    if (userFile.length !== 1) {
      throw new Error("File is not accessible by the user")
    }

    // Fetch file metadata
    const { data: fileMetadata, error: metadataError } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single()

    if (metadataError) {
      throw new Error(
        `Failed to retrieve file metadata: ${metadataError.message}`
      )
    }

    if (!fileMetadata) {
      return new Response(
        JSON.stringify({ message: "File metadata not found" }),
        {
          status: 404
        }
      )
    }

    // Use the file_path from the metadata to retrieve the file's content
    const { data: fileContent, error: contentError } =
      await supabaseAdmin.storage.from("files").download(fileMetadata.file_path)

    if (contentError) {
      throw new Error(
        `Failed to retrieve file content: ${contentError.message}`
      )
    }

    // Assuming the file content is text, convert the Blob to text to send it in the response
    const textContent = await fileContent.text()

    return new Response(JSON.stringify({ content: textContent }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    })
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
