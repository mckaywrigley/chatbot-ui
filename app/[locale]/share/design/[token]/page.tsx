"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  downloadDesignPdf,
  downloadJson,
  downloadMarkdown,
  type ExportableDesign
} from "@/lib/design/export"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/browser-client"
import { Copy, FileDown, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface PublicDesign {
  id: string
  name?: string
  description?: string
  content?: string | null
  sharing?: string
  workspace_id?: string
  forked_from?: any
}

export default function PublicDesignViewer({
  params
}: {
  params: { token: string; locale: string }
}) {
  const router = useRouter()
  const [design, setDesign] = useState<PublicDesign | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isForking, setIsForking] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/design/by-token/${params.token}`)
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "This link is invalid or has been revoked."
              : "Failed to load"
          )
        }
        const data = await res.json()
        if (!cancelled) setDesign(data)
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || "Failed to load design")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params.token])

  const parsedContent = useMemo(() => {
    if (!design?.content) return null
    if (typeof design.content !== "string") return design.content
    try {
      return JSON.parse(design.content)
    } catch {
      return null
    }
  }, [design?.content])

  const forkToWorkspace = useCallback(async () => {
    if (!design) return
    setIsForking(true)
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      if (!session) {
        router.push(
          `/${params.locale}/login?next=/${params.locale}/share/design/${params.token}`
        )
        return
      }

      // Pick the user's first workspace to fork into. API requires workspaceId.
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1)

      const workspaceId = workspaces?.[0]?.id
      if (!workspaceId) {
        toast.error("No workspace available to fork into.")
        return
      }

      const res = await fetch(`/api/design/${design.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Fork failed")

      toast.success("Copied to your workspace")
      router.push(`/${params.locale}/${workspaceId}/designs/${data.design.id}`)
    } catch (err: any) {
      toast.error(err?.message || "Fork failed")
    } finally {
      setIsForking(false)
    }
  }, [design, params.locale, params.token, router])

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy")
    }
  }, [])

  const handlePdf = useCallback(async () => {
    if (!design) return
    setIsExportingPdf(true)
    try {
      await downloadDesignPdf(design as ExportableDesign)
    } catch (err: any) {
      toast.error(err?.message || "PDF export failed")
    } finally {
      setIsExportingPdf(false)
    }
  }, [design])

  if (isLoading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading design…</p>
      </div>
    )
  }

  if (loadError || !design) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-2xl font-semibold">Design unavailable</h1>
        <p className="text-muted-foreground">
          {loadError || "This link is invalid or has been revoked."}
        </p>
      </div>
    )
  }

  const title = design.name || "Shared design"

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground text-xs">
            Read-only shared view
            {design.forked_from ? " · Forked copy" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copyLink}>
            <Copy className="mr-2 size-4" /> Copy link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadMarkdown(design as ExportableDesign)}
          >
            <FileDown className="mr-2 size-4" /> Markdown
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadJson(design as ExportableDesign)}
          >
            <FileDown className="mr-2 size-4" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePdf}
            disabled={isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 size-4" />
            )}
            PDF
          </Button>
          <Button size="sm" onClick={forkToWorkspace} disabled={isForking}>
            {isForking ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Duplicate to my workspace
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-4xl space-y-8 pb-16">
          {(() => {
            // Render the CURRENT design schema (DesignContentV2): a problem
            // block + hypotheses + each generated design's sections. (The old
            // viewer read a long-gone shape, which is why this page was empty.)
            const problem = parsedContent?.problem ?? {}
            const hypotheses: any[] = Array.isArray(parsedContent?.hypotheses)
              ? parsedContent.hypotheses
              : []
            const selectedHyps = hypotheses.filter((h: any) => h.selected)
            const shownHyps = selectedHyps.length ? selectedHyps : hypotheses
            const designs: any[] = Array.isArray(parsedContent?.designs)
              ? parsedContent.designs
              : []
            const objective = problem.objective ?? problem.goal
            const hasOverview = Boolean(
              problem.problemStatement || objective || shownHyps.length
            )
            const mdClass =
              "text-ink-700 text-sm leading-relaxed [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top"

            return (
              <>
                <section className="rounded-xl border p-5">
                  <h2 className="mb-3 text-lg font-semibold">
                    Research overview
                  </h2>
                  {!hasOverview ? (
                    <p className="text-muted-foreground text-sm">
                      No research details were shared.
                    </p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {problem.problemStatement && (
                        <div>
                          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                            Problem
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap">
                            {problem.problemStatement}
                          </p>
                        </div>
                      )}
                      {objective && (
                        <div>
                          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                            Objective
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap">
                            {objective}
                          </p>
                        </div>
                      )}
                      {(problem.domain || problem.phase) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {problem.domain && (
                            <span className="rounded-full border px-2 py-0.5">
                              {problem.domain}
                            </span>
                          )}
                          {problem.phase && (
                            <span className="rounded-full border px-2 py-0.5">
                              {problem.phase}
                            </span>
                          )}
                        </div>
                      )}
                      {shownHyps.length > 0 && (
                        <div>
                          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                            Hypotheses
                          </div>
                          <ul className="mt-1 space-y-2">
                            {shownHyps.map((h: any, i: number) => (
                              <li
                                key={h.id ?? i}
                                className="rounded-md border p-2"
                              >
                                <div className="font-medium">{h.text}</div>
                                {h.reasoning && (
                                  <div className="text-muted-foreground mt-0.5 text-xs">
                                    {h.reasoning}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="mb-3 text-lg font-semibold">Design output</h2>
                  {designs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No design has been generated for this experiment yet.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {designs.map((d: any, di: number) => (
                        <article
                          key={d.id ?? di}
                          className="rounded-xl border p-5"
                        >
                          {d.title && (
                            <h3 className="mb-3 text-base font-semibold">
                              {d.title}
                            </h3>
                          )}
                          <div className="space-y-4">
                            {(Array.isArray(d.sections) ? d.sections : []).map(
                              (s: any, si: number) => (
                                <div key={si}>
                                  <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
                                    {s.heading}
                                  </div>
                                  <div className={mdClass}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {s.body || ""}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
