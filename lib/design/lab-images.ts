/**
 * Turn uploaded image files (gel photos, instrument screenshots, scanned
 * result sheets, phone snaps of a notebook page) into model-ready data URLs for
 * the vision-based Validate parser. Downscaled + re-encoded via sharp so a 12MP
 * phone photo doesn't blow the token budget.
 *
 * Only IMAGE files go this route. Text-layer PDFs / CSV / docx keep the cheap
 * text-extraction path (lib/report/file-content). PDFs are NOT rasterized here
 * (that needs a heavy native renderer) — a scanned/image-only PDF should be
 * uploaded as an image instead, and the route says so.
 */
import sharp from "sharp"
import { getBillingAdminClient } from "@/lib/billing/service-client"

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"])

export function isImageFile(f: { name?: string; type?: string }): boolean {
  if (f.type && f.type.toLowerCase().startsWith("image/")) return true
  const ext = (f.name?.split(".").pop() ?? "").toLowerCase()
  return IMAGE_EXTS.has(ext)
}

export interface LabImage {
  fileName?: string
  /** `data:image/jpeg;base64,…` ready to drop into an image_url message part. */
  dataUrl: string
}

/**
 * Resolve Supabase `files.id`s that are images to normalized JPEG data URLs.
 * Missing/undownloadable/undecodable files are skipped (best-effort) rather than
 * failing the whole parse.
 */
export async function resolveFilesToImageDataUrls(
  fileIds: string[]
): Promise<LabImage[]> {
  const ids = [...new Set(fileIds)].filter(Boolean)
  if (ids.length === 0) return []

  const admin = getBillingAdminClient()
  const { data: metas, error } = await admin
    .from("files")
    .select("id,name,file_path,type")
    .in("id", ids)
  if (error || !metas) return []

  const out: LabImage[] = []
  for (const m of metas as any[]) {
    if (!m.file_path) continue
    try {
      const { data: blob } = await admin.storage
        .from("files")
        .download(m.file_path)
      if (!blob) continue
      const input = Buffer.from(await blob.arrayBuffer())
      // Cap the long edge at 1568px (the vision sweet spot) and re-encode to
      // JPEG q80 — keeps tables/plots legible while bounding tokens + cost.
      const normalized = await sharp(input)
        .rotate() // honor EXIF orientation
        .resize({
          width: 1568,
          height: 1568,
          fit: "inside",
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer()
      out.push({
        fileName: m.name,
        dataUrl: `data:image/jpeg;base64,${normalized.toString("base64")}`
      })
    } catch {
      // undecodable image → skip; the route surfaces a "couldn't read" note.
    }
  }
  return out
}
