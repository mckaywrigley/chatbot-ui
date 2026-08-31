"use client"

/**
 * Inline "proposed edit" chip rendered by the chat when the assistant suggests
 * a change to a design. The assistant emits:
 *
 *   <design-patch>
 *   { "sectionHeading": "Materials", "find": "5 mM phosphate buffer",
 *     "replace": "20 mM phosphate buffer", "designIndex": 0 }
 *   </design-patch>
 *
 * The chip shows a one-line summary + "Review change" button that opens a
 * popup with the change rendered READABLY (markdown → tables/bold), so the
 * scientist can read the proposed design before approving. Approving dispatches
 * a `design:apply-patch` CustomEvent that the design page applies + persists.
 *
 * Applied patches are tracked by signature in a module-level set (+ a
 * `design:patch-applied` broadcast) so a patch stays "Applied" across
 * re-renders and duplicate copies - fixes the "asks to approve twice" bug.
 */

import { useContext, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import { IconCheck, IconEdit, IconLoader2, IconX } from "@tabler/icons-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { ChatbotUIContext } from "@/context/context"
import { trackDecision } from "@/lib/eval/track"
import { cn } from "@/lib/utils"

export interface DesignPatch {
  sectionHeading: string
  find?: string
  replace?: string
  /** Optional: replace the whole section body. */
  newBody?: string
  /** Which generated design to apply to (default: the active one). */
  designIndex?: number
}

interface DesignPatchBlockProps {
  patch: DesignPatch
}

/** Stable signature for a patch, used to dedupe + remember applied state. */
export function patchSignature(p: DesignPatch): string {
  return JSON.stringify({
    h: (p.sectionHeading || "").trim(),
    f: p.find ?? null,
    r: p.replace ?? null,
    b: p.newBody ?? null,
    i: p.designIndex ?? null
  })
}

// Survives re-renders within a session so an applied patch can't re-prompt.
const appliedSignatures = new Set<string>()

const mdComponents = {
  table: (props: any) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th
      className="border-line bg-paper-2 border px-2 py-1 text-left font-semibold"
      {...props}
    />
  ),
  td: (props: any) => (
    <td className="border-line border px-2 py-1 align-top" {...props} />
  )
}

export function DesignPatchBlock({ patch }: DesignPatchBlockProps) {
  const sig = useMemo(() => patchSignature(patch), [patch])
  const { selectedChat } = useContext(ChatbotUIContext)
  const routeParams = useParams() as { designId?: string }
  // Resolve which design to edit so we can always use the reliable, persisting
  // server path. Prefer the chat's design scope; otherwise fall back to the
  // design route (the in-design chat rail lives on /designs/[designId]), so an
  // edit proposed in the rail persists even when the chat row isn't tagged
  // design-scoped. Previously this only read the chat scope, so the in-design
  // rail fell through to a fire-and-forget window event that reported success
  // without ever saving - the "applied but unchanged after refresh" bug.
  const routeDesignId =
    typeof routeParams?.designId === "string" &&
    routeParams.designId !== "new" &&
    routeParams.designId !== "undefined"
      ? routeParams.designId
      : null
  const designId =
    (selectedChat?.scope === "design"
      ? (selectedChat?.scope_id ?? null)
      : null) ?? routeDesignId
  const [state, setState] = useState<"pending" | "applied" | "rejected">(
    appliedSignatures.has(sig) ? "applied" : "pending"
  )
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Keep duplicate copies of the same patch in sync - once one is applied,
  // every other card showing the same change flips to "Applied".
  useEffect(() => {
    const onApplied = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === sig) setState("applied")
    }
    window.addEventListener("design:patch-applied", onApplied as EventListener)
    return () =>
      window.removeEventListener(
        "design:patch-applied",
        onApplied as EventListener
      )
  }, [sig])

  const markApplied = () => {
    // A chat-proposed edit accepted verbatim. The cleanest approve signal in
    // the product: the model wrote an exact change and a human said yes to
    // precisely that text, with no editing in between - so unlike a section
    // edit there is no ambiguity about what was approved.
    trackDecision({
      surface: "design_patch",
      decision: "approved_as_is",
      subjectType: "design",
      subjectId: designId ?? undefined,
      itemKey: patch.sectionHeading,
      editedRatio: 0,
      meta: {
        patchKind: isWholeReplace ? "replace_section" : "find_replace",
        proposedChars: (patch.newBody ?? patch.replace ?? "").length
      }
    })
    appliedSignatures.add(sig)
    window.dispatchEvent(
      new CustomEvent<string>("design:patch-applied", { detail: sig })
    )
    setState("applied")
    setOpen(false)
  }

  const handleApprove = async () => {
    if (busy) return
    // Preferred path: apply + persist server-side, so it works from anywhere
    // and the change is saved even when the design editor isn't mounted.
    if (designId) {
      setBusy(true)
      try {
        const res = await fetch(`/api/design/${designId}/apply-patch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patch, activeDesignId: null })
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(json?.error ?? "Couldn't apply the edit.")
          return
        }
        toast.success(
          `Design updated${json?.sectionHeading ? ` - “${json.sectionHeading}”` : ""}`
        )
        // Sync any open editor live (no navigation).
        window.dispatchEvent(
          new CustomEvent("design:content-updated", {
            detail: { designId, designs: json?.designs }
          })
        )
        markApplied()
      } catch {
        toast.error("Couldn't apply the edit. Try again.")
      } finally {
        setBusy(false)
      }
      return
    }
    // No design id resolvable from the chat scope OR the route - we can't
    // persist the edit from here (and the editor isn't mounted to do it).
    // Best-effort dispatch for any mounted editor, but do NOT fake success:
    // the previous unconditional markApplied() is exactly what made the card
    // say "Applied" while nothing was saved.
    window.dispatchEvent(
      new CustomEvent<DesignPatch>("design:apply-patch", { detail: patch })
    )
    toast.error("Open this design to apply the change.")
  }

  const isWholeReplace = !!patch.newBody && !patch.find

  return (
    /* Wraps rather than packing everything onto one row. These cards render
       inside the in-design chat RAIL, which is far narrower than the main
       chat column: the label and the two shrink-0 buttons together exceeded
       the rail's width, so the actions rode over the section name. The status
       row now sits under the label whenever there isn't room beside it. */
    <div
      className={cn(
        "border-orange-product/40 bg-orange-product-tint/40 my-3 rounded-xl border px-3 py-2.5",
        state === "applied" && "border-emerald-300 bg-emerald-50",
        state === "rejected" && "opacity-50 grayscale"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="text-orange-product flex size-7 shrink-0 items-center justify-center rounded-full bg-white/70">
          <IconEdit size={14} />
        </div>
        <div className="min-w-[120px] flex-1">
          <div className="text-ink text-[12.5px] font-semibold">
            Proposed edit
          </div>
          <div className="text-ink-3 break-words text-[11.5px]">
            Section: <b className="text-ink-2">{patch.sectionHeading}</b>
          </div>
        </div>
        {state === "applied" ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <IconCheck size={12} /> Applied
          </span>
        ) : state === "rejected" ? (
          <span className="text-ink-3 bg-paper-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold">
            Dismissed
          </span>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                // The rejection half. Without it the log holds only accepted
                // patches, and an approval rate has no denominator.
                trackDecision({
                  surface: "design_patch",
                  decision: "rejected",
                  subjectType: "design",
                  subjectId: designId ?? undefined,
                  itemKey: patch.sectionHeading,
                  meta: {
                    patchKind: isWholeReplace
                      ? "replace_section"
                      : "find_replace"
                  }
                })
                setState("rejected")
              }}
              className="text-ink-3 hover:bg-paper-2 hover:text-ink inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium"
            >
              <IconX size={12} />
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="bg-ink text-paper inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11.5px] font-semibold hover:opacity-90"
            >
              Review change
            </button>
          </div>
        )}
      </div>

      {/* Readable review popup */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-base">
              Review proposed edit ·{" "}
              <span className="text-ink-2">{patch.sectionHeading}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {isWholeReplace ? (
              <div>
                <div className="text-ink-3 mb-1 text-[11px] font-semibold uppercase tracking-wider">
                  New section content
                </div>
                <div className="border-line rounded-lg border bg-white p-3 text-[13px] leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={mdComponents}
                  >
                    {patch.newBody || ""}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-red-700">
                    Current
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-lg border border-red-200 bg-red-50 p-3 font-mono text-[12px] text-red-900">
                    {patch.find}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Proposed
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-[13px] leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={mdComponents}
                    >
                      {patch.replace || ""}
                    </ReactMarkdown>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ink-2 hover:bg-paper-2 inline-flex h-9 items-center rounded-md px-3 text-[13px] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconCheck size={14} />
              )}
              {busy ? "Applying…" : "Approve & apply"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Pull patch blocks out of a raw assistant message. Returns ordered segments -
 * plain text (rendered via the normal markdown pipeline) or a parsed patch.
 * Identical patches that repeat within the SAME message are de-duplicated to a
 * single card (the model sometimes echoes the change twice). Malformed JSON
 * falls through to a text segment so the user still sees what was said.
 */
/**
 * True when an assistant message TALKS as if it already changed the design but
 * carries no patch block. The design can only change when the researcher
 * approves a patch card, so this is always a false claim - we surface a warning
 * next to the message rather than let the researcher walk away believing their
 * protocol was updated.
 */
export function claimsAppliedWithoutPatch(content: string): boolean {
  if (/<design-patch>/.test(content)) return false
  return /\b(i(?:'ve| have)?\s+(?:now\s+)?(?:updated|applied|changed|revised|edited|modified|replaced)|the design (?:now|has been)\s|changes? (?:have been|were) (?:applied|made)|i\s+made\s+(?:the|those|these)\s+changes?)\b/i.test(
    content
  )
}

export function extractDesignPatches(
  content: string
): Array<
  { kind: "text"; value: string } | { kind: "patch"; patch: DesignPatch }
> {
  const regex = /<design-patch>([\s\S]*?)<\/design-patch>/g
  const out: Array<
    { kind: "text"; value: string } | { kind: "patch"; patch: DesignPatch }
  > = []
  const seen = new Set<string>()
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(content)) !== null) {
    if (m.index > lastIndex) {
      out.push({ kind: "text", value: content.slice(lastIndex, m.index) })
    }
    const raw = m[1].trim()
    try {
      const parsed = JSON.parse(raw) as DesignPatch
      if (
        parsed &&
        typeof parsed.sectionHeading === "string" &&
        (parsed.find !== undefined || parsed.newBody !== undefined)
      ) {
        const s = patchSignature(parsed)
        if (!seen.has(s)) {
          seen.add(s)
          out.push({ kind: "patch", patch: parsed })
        }
        // duplicate copy → drop entirely (don't re-render the same approve card)
      } else {
        out.push({ kind: "text", value: m[0] })
      }
    } catch {
      out.push({ kind: "text", value: m[0] })
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < content.length) {
    out.push({ kind: "text", value: content.slice(lastIndex) })
  }
  return out
}
