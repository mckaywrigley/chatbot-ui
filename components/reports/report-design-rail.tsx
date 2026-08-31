"use client"

/**
 * Right-side rail on the report page that ties a generated report back to its
 * parent design. Shown only when the report was spawned from a design.
 *
 *  - "Parent design": expands to the full design (rendered from the markdown
 *    snapshot taken at generation time) with a link to open the live design.
 *  - "Uploaded files": expands to every file fed into the report; clicking a
 *    file opens it via a signed storage URL.
 */

import { getFileFromStorage } from "@/db/storage/files"
import {
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconFile,
  IconFlask
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { FC, useMemo, useState } from "react"
import { toast } from "sonner"

import { MessageMarkdown } from "@/components/messages/message-markdown"
import { Button } from "@/components/ui/button"

interface ReportFile {
  id?: string
  name?: string
  file_path?: string
  type?: string
}

interface ReportDesignRailProps {
  designId: string
  designName: string | null
  designContext: string | null
  files: {
    protocol?: ReportFile[]
    papers?: ReportFile[]
    dataFiles?: ReportFile[]
  }
  locale: string
  workspaceId: string
}

export const ReportDesignRail: FC<ReportDesignRailProps> = ({
  designId,
  designName,
  designContext,
  files,
  locale,
  workspaceId
}) => {
  const router = useRouter()
  const [designOpen, setDesignOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(true)

  const allFiles = useMemo(() => {
    const tagged: Array<ReportFile & { bucket: string }> = []
    for (const f of files?.protocol ?? [])
      tagged.push({ ...f, bucket: "Protocol" })
    for (const f of files?.papers ?? [])
      tagged.push({ ...f, bucket: "Reference" })
    for (const f of files?.dataFiles ?? [])
      tagged.push({ ...f, bucket: "Data" })
    return tagged
  }, [files])

  const openFile = async (file: ReportFile) => {
    if (!file?.file_path) {
      toast.error("This file has no stored path to open.")
      return
    }
    try {
      const url = await getFileFromStorage(file.file_path)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Couldn't open the file.")
    }
  }

  return (
    <aside className="border-ink-200 w-[300px] shrink-0 space-y-3 overflow-y-auto border-l bg-white p-4">
      {/* Parent design */}
      <div className="border-ink-200 overflow-hidden rounded-xl border">
        <button
          type="button"
          onClick={() => setDesignOpen(o => !o)}
          className="hover:bg-ink-50 flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2">
            <IconFlask size={15} className="text-teal-journey" />
            <span className="text-ink-900 text-[13px] font-semibold">
              {designName || "Parent design"}
            </span>
          </span>
          {designOpen ? (
            <IconChevronDown size={15} className="text-ink-400" />
          ) : (
            <IconChevronRight size={15} className="text-ink-400" />
          )}
        </button>
        {designOpen && (
          <div className="border-ink-100 space-y-3 border-t p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() =>
                router.push(`/${locale}/${workspaceId}/designs/${designId}`)
              }
            >
              <IconExternalLink size={13} /> Open full design
            </Button>
            {designContext ? (
              <div className="max-h-[340px] overflow-y-auto pr-1 text-[12.5px] leading-relaxed">
                <MessageMarkdown content={designContext} />
              </div>
            ) : (
              <p className="text-ink-400 text-[12px]">
                No design snapshot was captured for this report.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Uploaded files */}
      <div className="border-ink-200 overflow-hidden rounded-xl border">
        <button
          type="button"
          onClick={() => setFilesOpen(o => !o)}
          className="hover:bg-ink-50 flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="text-ink-900 text-[13px] font-semibold">
            Uploaded files
            <span className="text-ink-400 ml-1.5 font-normal">
              {allFiles.length}
            </span>
          </span>
          {filesOpen ? (
            <IconChevronDown size={15} className="text-ink-400" />
          ) : (
            <IconChevronRight size={15} className="text-ink-400" />
          )}
        </button>
        {filesOpen && (
          <div className="border-ink-100 border-t p-2">
            {allFiles.length === 0 ? (
              <p className="text-ink-400 p-1 text-[12px]">
                No files were uploaded for this report.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {allFiles.map((f, i) => (
                  <li key={f.id ?? i}>
                    <button
                      type="button"
                      onClick={() => openFile(f)}
                      title={f.name}
                      className="hover:bg-ink-50 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
                    >
                      <IconFile size={14} className="text-ink-400 shrink-0" />
                      <span className="text-ink-700 truncate text-[12.5px]">
                        {f.name || "Untitled file"}
                      </span>
                      <span className="text-ink-400 ml-auto shrink-0 text-[10px] uppercase">
                        {f.bucket}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
