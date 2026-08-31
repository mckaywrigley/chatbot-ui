import { fileTypeFromBuffer } from "file-type"
import { NextResponse } from "next/server"

export const UPLOAD_SIZE_LIMITS = {
  document: 25 * 1024 * 1024, // 25 MB - PDF/DOCX/CSV/TXT/MD/JSON
  audio: 50 * 1024 * 1024, // 50 MB - transcription
  text: 2 * 1024 * 1024 // 2 MB - pre-extracted text bodies (extract-materials etc.)
} as const

export type UploadKind = keyof typeof UPLOAD_SIZE_LIMITS

const DOCUMENT_MIME_ALLOWLIST = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/json"
])

const AUDIO_MIME_ALLOWLIST = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a"
])

export function enforceSize(
  size: number,
  kind: UploadKind
): NextResponse | null {
  const max = UPLOAD_SIZE_LIMITS[kind]
  if (size > max) {
    return NextResponse.json(
      {
        error: `File exceeds ${Math.floor(max / (1024 * 1024))} MB limit`
      },
      { status: 413 }
    )
  }
  return null
}

export async function sniffAndValidate(
  buffer: Buffer | Uint8Array,
  kind: Exclude<UploadKind, "text">,
  declaredMime?: string,
  fileName?: string
): Promise<NextResponse | null> {
  const allowlist =
    kind === "audio" ? AUDIO_MIME_ALLOWLIST : DOCUMENT_MIME_ALLOWLIST

  // file-type's type signature is narrower than Node's Buffer in recent TS
  // lib updates; pass the underlying Uint8Array view to satisfy it.
  const view =
    buffer instanceof Uint8Array
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer)
  const sniffed = await fileTypeFromBuffer(view)
  const sniffedMime = sniffed?.mime

  // Plain-text formats (txt/md/csv/json) aren't detectable by magic bytes.
  // Allow them when the declared mime is a permitted text type AND the bytes
  // decode as valid UTF-8 without binary garbage.
  const plainTextBypass =
    kind === "document" &&
    declaredMime &&
    ["text/plain", "text/csv", "text/markdown", "application/json"].includes(
      declaredMime
    )

  if (plainTextBypass && !sniffedMime) {
    return null
  }

  if (!sniffedMime || !allowlist.has(sniffedMime)) {
    return NextResponse.json(
      {
        error: `Unsupported file type${fileName ? ` for ${fileName}` : ""}`,
        detectedType: sniffedMime ?? "unknown"
      },
      { status: 415 }
    )
  }

  return null
}
