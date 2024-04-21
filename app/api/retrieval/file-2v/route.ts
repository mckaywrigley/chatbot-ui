import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import { getServerProfile } from "@/lib/server/server-chat-helpers"

export async function POST(req: Request) {
  const json = await req.json()
  const { fileIds } = json as {
    fileIds: string[]
  }

  if (fileIds.length > 3) {
    return new Response(
      JSON.stringify({
        message: "Maximum of 3 txt files allowed per request with plugins"
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      }
    )
  }

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const profile = await getServerProfile()

    const fileDataArray = []

    for (const fileId of fileIds) {
      const { data: userFile, error: userFileError } = await supabaseAdmin
        .from("files")
        .select("id")
        .eq("id", fileId)
        .eq("user_id", profile.user_id)

      if (userFileError) {
        throw new Error(
          `Failed to retrieve user file: ${userFileError.message}`
        )
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
        throw new Error("File metadata not found")
      }

      // Use the file_path from the metadata to retrieve the file's content
      const { data: fileContent, error: contentError } =
        await supabaseAdmin.storage
          .from("files")
          .download(fileMetadata.file_path)

      if (contentError) {
        throw new Error(
          `Failed to retrieve file content: ${contentError.message}`
        )
      }

      // Assuming the file content is text, convert the Blob to text
      const textContent = await fileContent.text()

      fileDataArray.push({
        fileName: fileMetadata.name,
        fileContent: textContent
      })
    }

    return new Response(JSON.stringify({ files: fileDataArray }), {
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
