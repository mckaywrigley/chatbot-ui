/**
 * Per-source-type extractors. Each returns the chunks to embed PLUS the
 * full document text (used by the contextualizer to generate per-chunk
 * blurbs) PLUS the denormalized metadata for citation rendering.
 *
 * Reuses CHUNK_SIZE/CHUNK_OVERLAP from lib/retrieval/processing/index.ts
 * for consistency with the legacy file pipeline.
 */
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

import { CHUNK_OVERLAP, CHUNK_SIZE } from "@/lib/retrieval/processing"

import type { ChunkInput, ExtractorResult, SourceMeta } from "@/lib/rag/types"

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP
})

/** Split long text into chunks; preserve a section title on every output. */
async function splitWithSection(
  text: string,
  sectionTitle?: string
): Promise<ChunkInput[]> {
  const trimmed = (text || "").trim()
  if (!trimmed) return []
  const docs = await splitter.createDocuments([trimmed])
  return docs
    .map(d => d.pageContent.trim())
    .filter(Boolean)
    .map(content => ({ content, sectionTitle }))
}

// ── Designs ──────────────────────────────────────────────────────────────

export interface DesignContentLike {
  problem?: {
    title?: string | null
    problemStatement?: string | null
    objective?: string | null
    domain?: string | null
    phase?: string | null
  } | null
  papers?: Array<{
    id?: string
    title?: string
    summary?: string | null
    sourceUrl?: string | null
  }> | null
  hypotheses?: Array<{
    id?: string
    text?: string
    selected?: boolean
  }> | null
  designs?: Array<{
    id?: string
    title?: string | null
    sections?: Array<{ heading?: string | null; body?: string | null }>
    saved?: boolean
  }> | null
}

export interface DesignDoc {
  id: string
  user_id: string
  workspace_id: string
  project_id?: string | null
  name?: string | null
  updated_at?: string | null
  content?: DesignContentLike | string | null
}

function parseDesignContent(
  raw: DesignContentLike | string | null | undefined
): DesignContentLike {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as DesignContentLike
    } catch {
      return {}
    }
  }
  return raw
}

export async function extractDesign(
  design: DesignDoc
): Promise<ExtractorResult> {
  const content = parseDesignContent(design.content)
  const title = content.problem?.title ?? design.name ?? "Untitled design"

  const fullDocLines: string[] = [`# Design: ${title}`]
  const chunks: ChunkInput[] = []

  if (content.problem?.problemStatement) {
    fullDocLines.push(`## Problem\n${content.problem.problemStatement}`)
    chunks.push(
      ...(await splitWithSection(content.problem.problemStatement, "Problem"))
    )
  }
  if (content.problem?.objective) {
    fullDocLines.push(`## Objective\n${content.problem.objective}`)
    chunks.push(
      ...(await splitWithSection(content.problem.objective, "Objective"))
    )
  }

  for (const h of content.hypotheses ?? []) {
    const text = (h.text ?? "").trim()
    if (!text) continue
    const heading = `Hypothesis ${h.id ?? ""}`.trim()
    fullDocLines.push(`## ${heading}\n${text}`)
    chunks.push(...(await splitWithSection(text, heading)))
  }

  for (const p of content.papers ?? []) {
    const summary = (p.summary ?? "").trim()
    if (!summary) continue
    const heading = `Paper: ${p.title ?? "Untitled"}`
    fullDocLines.push(`## ${heading}\n${summary}`)
    chunks.push(...(await splitWithSection(summary, heading)))
  }

  for (const d of content.designs ?? []) {
    for (const sec of d.sections ?? []) {
      const body = (sec.body ?? "").trim()
      if (!body) continue
      const heading = sec.heading?.trim() || "Untitled section"
      const fullHeading = `${d.title ?? "Generated design"} - ${heading}`
      fullDocLines.push(`## ${fullHeading}\n${body}`)
      chunks.push(...(await splitWithSection(body, fullHeading)))
    }
  }

  const metadata: SourceMeta = {
    source_type: "design",
    source_id: design.id,
    workspace_id: design.workspace_id,
    project_id: design.project_id ?? null,
    user_id: design.user_id,
    source_title: title,
    source_url: `/designs/${design.id}`,
    source_updated_at: design.updated_at ?? null,
    metadata: {}
  }

  return {
    fullDocText: fullDocLines.join("\n\n"),
    chunks,
    denormalizedMetadata: metadata
  }
}

// ── Reports ──────────────────────────────────────────────────────────────

export interface ReportDoc {
  id: string
  user_id: string
  workspace_id: string
  project_id?: string | null
  name?: string | null
  description?: string | null
  updated_at?: string | null
  report_outline?: unknown
  report_draft?: Record<string, unknown> | null
  files?: { protocol?: any[]; papers?: any[]; dataFiles?: any[] } | null
}

function stringifyOutline(outline: unknown): string {
  if (!outline) return ""
  if (typeof outline === "string") return outline
  try {
    return JSON.stringify(outline, null, 2)
  } catch {
    return ""
  }
}

export async function extractReport(
  report: ReportDoc
): Promise<ExtractorResult> {
  const title = report.name?.trim() || "Untitled report"
  const fullDocLines: string[] = [`# Report: ${title}`]
  const chunks: ChunkInput[] = []

  if (report.description?.trim()) {
    fullDocLines.push(`## Description\n${report.description}`)
    chunks.push(...(await splitWithSection(report.description, "Description")))
  }

  const outlineText = stringifyOutline(report.report_outline)
  if (outlineText.trim()) {
    fullDocLines.push(`## Outline\n${outlineText}`)
    chunks.push(...(await splitWithSection(outlineText, "Outline")))
  }

  const draft = report.report_draft ?? {}
  for (const [key, value] of Object.entries(draft)) {
    if (key === "_chartData") continue
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2)
    if (!text || !text.trim()) continue
    const heading = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, s => s.toUpperCase())
    fullDocLines.push(`## ${heading}\n${text}`)
    chunks.push(...(await splitWithSection(text, heading)))
  }

  // File attachments - filenames + descriptions only (the file CONTENT is
  // embedded separately under source_type='file' or 'project_file').
  const fileSnapshot = report.files ?? {}
  const fileLines: string[] = []
  for (const group of ["protocol", "papers", "dataFiles"] as const) {
    for (const f of (fileSnapshot as any)?.[group] ?? []) {
      const name = f?.name ?? f?.title ?? "(untitled)"
      const desc = f?.description ?? ""
      fileLines.push(`- [${group}] ${name}${desc ? ` - ${desc}` : ""}`)
    }
  }
  if (fileLines.length > 0) {
    const text = fileLines.join("\n")
    fullDocLines.push(`## Attached files\n${text}`)
    chunks.push(...(await splitWithSection(text, "Attached files")))
  }

  const metadata: SourceMeta = {
    source_type: "report",
    source_id: report.id,
    workspace_id: report.workspace_id,
    project_id: report.project_id ?? null,
    user_id: report.user_id,
    source_title: title,
    source_url: `/reports/${report.id}`,
    source_updated_at: report.updated_at ?? null,
    metadata: {}
  }

  return {
    fullDocText: fullDocLines.join("\n\n"),
    chunks,
    denormalizedMetadata: metadata
  }
}

// ── Paper library ────────────────────────────────────────────────────────

export interface PaperLibraryDoc {
  id: string
  user_id: string
  workspace_id: string
  title?: string
  summary?: string | null
  url?: string | null
  authors?: string[]
  journal?: string | null
  year?: string | null
  source?: string | null
  updated_at?: string | null
}

export async function extractPaperLibrary(
  paper: PaperLibraryDoc
): Promise<ExtractorResult> {
  const title = paper.title?.trim() || "Untitled paper"
  const summary = (paper.summary ?? "").trim()
  const meta = [
    paper.authors?.length ? paper.authors.join(", ") : "",
    paper.journal ?? "",
    paper.year ?? ""
  ]
    .filter(Boolean)
    .join(" · ")

  const body = [meta, summary].filter(Boolean).join("\n\n")
  const fullDocText = `# Paper: ${title}\n\n${body || title}`

  const chunks: ChunkInput[] =
    body.trim().length > 0
      ? await splitWithSection(`${title}\n\n${body}`, "Paper summary")
      : [{ content: title, sectionTitle: "Paper summary" }]

  const metadata: SourceMeta = {
    source_type: "paper_library",
    source_id: paper.id,
    workspace_id: paper.workspace_id,
    project_id: null,
    user_id: paper.user_id,
    source_title: title,
    source_url: paper.url ?? `/papers/${paper.id}`,
    source_updated_at: paper.updated_at ?? null,
    metadata: {
      authors: paper.authors ?? [],
      year: paper.year ?? null,
      journal: paper.journal ?? null,
      source: paper.source ?? null
    }
  }

  return { fullDocText, chunks, denormalizedMetadata: metadata }
}

// ── Data collections ─────────────────────────────────────────────────────

export interface DataCollectionDoc {
  id: string
  user_id: string
  workspace_id: string
  project_id?: string | null
  name?: string | null
  description?: string | null
  updated_at?: string | null
  template_columns?: string[] | null
  structured_data?: unknown
}

export async function extractDataCollection(
  dc: DataCollectionDoc
): Promise<ExtractorResult> {
  const title = dc.name?.trim() || "Untitled data collection"
  const fullDocLines: string[] = [`# Data collection: ${title}`]
  const chunks: ChunkInput[] = []

  if (dc.description?.trim()) {
    fullDocLines.push(`## Description\n${dc.description}`)
    chunks.push(...(await splitWithSection(dc.description, "Description")))
  }

  const cols = dc.template_columns?.filter(Boolean) ?? []
  if (cols.length > 0) {
    const text = cols.join(", ")
    fullDocLines.push(`## Columns\n${text}`)
    chunks.push(...(await splitWithSection(text, "Columns")))
  }

  if (dc.structured_data) {
    let text = ""
    try {
      text = JSON.stringify(dc.structured_data, null, 2)
    } catch {
      text = ""
    }
    if (text.trim()) {
      fullDocLines.push(`## Structured data\n${text}`)
      chunks.push(...(await splitWithSection(text, "Structured data")))
    }
  }

  const metadata: SourceMeta = {
    source_type: "data_collection",
    source_id: dc.id,
    workspace_id: dc.workspace_id,
    project_id: dc.project_id ?? null,
    user_id: dc.user_id,
    source_title: title,
    source_url: `/data-collection/${dc.id}`,
    source_updated_at: dc.updated_at ?? null,
    metadata: {}
  }

  return {
    fullDocText: fullDocLines.join("\n\n"),
    chunks,
    denormalizedMetadata: metadata
  }
}

// ── Files (Supabase) - wraps the legacy processors ───────────────────────

export interface FileDoc {
  id: string
  user_id: string
  workspace_id: string
  name?: string | null
  description?: string | null
  type?: string | null
  updated_at?: string | null
}

/**
 * Wrap pre-extracted text from the legacy PDF/CSV/etc. processors. We
 * don't re-parse here - `app/api/retrieval/process/route.ts` already
 * extracts text and passes it on.
 */
export async function extractFile(
  file: FileDoc,
  fullText: string
): Promise<ExtractorResult> {
  const title = file.name?.trim() || "Untitled file"
  const chunks = await splitWithSection(fullText, undefined)

  const metadata: SourceMeta = {
    source_type: "file",
    source_id: file.id,
    workspace_id: file.workspace_id,
    project_id: null,
    user_id: file.user_id,
    source_title: title,
    source_url: `/files/${file.id}`,
    source_updated_at: file.updated_at ?? null,
    metadata: {
      mime_type: file.type ?? null,
      description: file.description ?? null
    }
  }

  return {
    fullDocText: `# File: ${title}\n\n${fullText}`,
    chunks,
    denormalizedMetadata: metadata
  }
}

// ── Project files ────────────────────────────────────────────────────────

export interface ProjectFileDoc {
  id: string
  user_id: string
  workspace_id: string
  project_id: string
  name?: string | null
  mime_type?: string | null
  created_at?: string | null
}

export async function extractProjectFile(
  pf: ProjectFileDoc,
  fullText: string
): Promise<ExtractorResult> {
  const title = pf.name?.trim() || "Untitled project file"
  const chunks = await splitWithSection(fullText, undefined)

  const metadata: SourceMeta = {
    source_type: "project_file",
    source_id: pf.id,
    workspace_id: pf.workspace_id,
    project_id: pf.project_id,
    user_id: pf.user_id,
    source_title: title,
    source_url: `/projects/${pf.project_id}#file-${pf.id}`,
    source_updated_at: pf.created_at ?? null,
    metadata: { mime_type: pf.mime_type ?? null }
  }

  return {
    fullDocText: `# Project file: ${title}\n\n${fullText}`,
    chunks,
    denormalizedMetadata: metadata
  }
}

// ── Chat messages ────────────────────────────────────────────────────────

export interface ChatMessageDoc {
  id: string
  chat_id: string
  user_id: string
  workspace_id: string
  project_id?: string | null
  role: string
  content: string
  created_at?: string | null
  chat_name?: string | null
}

const MIN_CHAT_MESSAGE_CHARS = 50

export async function extractChatMessage(
  msg: ChatMessageDoc
): Promise<ExtractorResult | null> {
  const text = (msg.content ?? "").trim()
  if (text.length < MIN_CHAT_MESSAGE_CHARS) return null

  const title = msg.chat_name?.trim() || "Chat"
  const sectionTitle = `${title} (${msg.role})`
  const chunks = await splitWithSection(text, sectionTitle)

  const metadata: SourceMeta = {
    source_type: "chat_message",
    source_id: msg.id,
    workspace_id: msg.workspace_id,
    project_id: msg.project_id ?? null,
    user_id: msg.user_id,
    source_title: title,
    source_url: `/chat/${msg.chat_id}#m-${msg.id}`,
    source_updated_at: msg.created_at ?? null,
    metadata: { role: msg.role }
  }

  return {
    fullDocText: `# ${title} message\n\n${text}`,
    chunks,
    denormalizedMetadata: metadata
  }
}
