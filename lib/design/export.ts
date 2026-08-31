"use client"

export interface ExportableDesign {
  id?: string
  name?: string
  description?: string
  content?: any
}

function parsedContent(design: ExportableDesign): any {
  const raw = design.content
  if (!raw) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return { raw }
    }
  }
  return raw
}

// ── New-schema (DesignContentV2) renderers ──────────────────────────────────
// Designs are stored as { problem, papers[], hypotheses[], designs[] } where
// each generated design is { title, sections: [{ heading, body }] }. The old
// exporters read a long-gone shape (generatedDesign/selectedHypothesis), which
// is why Markdown / JSON / the public share page all came back empty.

function problemLines(content: any): string[] {
  const p = content?.problem ?? {}
  const out: string[] = []
  if (p.title) out.push(`**Title:** ${p.title}`)
  if (p.problemStatement) out.push(`**Problem:** ${p.problemStatement}`)
  const objective = p.objective ?? p.goal
  if (objective) out.push(`**Objective:** ${objective}`)
  if (p.domain) out.push(`**Domain:** ${p.domain}`)
  if (p.phase) out.push(`**Phase:** ${p.phase}`)
  return out
}

function hypothesisLines(content: any): string[] {
  const hyps = Array.isArray(content?.hypotheses) ? content.hypotheses : []
  if (!hyps.length) return []
  const out: string[] = ["## Hypotheses"]
  hyps.forEach((h: any, i: number) => {
    const tag = h.selected ? " [selected]" : ""
    out.push("", `${i + 1}.${tag} ${h.text ?? ""}`)
    if (h.reasoning) out.push(`   Reasoning: ${h.reasoning}`)
  })
  return out
}

function literatureLines(content: any): string[] {
  const papers = Array.isArray(content?.papers) ? content.papers : []
  const cited = papers.filter((p: any) => p.selected)
  const use = cited.length ? cited : papers
  if (!use.length) return []
  const out: string[] = ["## Literature"]
  use.forEach((p: any, i: number) => {
    const meta = [
      Array.isArray(p.authors) ? p.authors.join(", ") : "",
      p.year ?? "",
      p.journal ?? ""
    ]
      .filter(Boolean)
      .join(" · ")
    out.push(
      "",
      `${i + 1}. ${p.title ?? "Untitled"}${meta ? ` - ${meta}` : ""}`
    )
    if (p.summary) out.push(`   ${p.summary}`)
  })
  return out
}

export function designToMarkdown(design: ExportableDesign): string {
  const content = parsedContent(design)
  const lines: string[] = [
    `# ${design.name || content?.problem?.title || "Untitled design"}`
  ]
  if (design.description) lines.push("", design.description)
  if (!content) return lines.join("\n")

  const probs = problemLines(content)
  if (probs.length) lines.push("", "## Research problem", "", ...probs)

  const hyps = hypothesisLines(content)
  if (hyps.length) lines.push("", ...hyps)

  const lit = literatureLines(content)
  if (lit.length) lines.push("", ...lit)

  const designs = Array.isArray(content.designs) ? content.designs : []
  designs.forEach((d: any) => {
    lines.push("", `## Design: ${d.title ?? "Untitled"}`)
    ;(Array.isArray(d.sections) ? d.sections : []).forEach((s: any) => {
      lines.push("", `### ${s.heading}`, "", s.body ?? "")
    })
  })

  return lines.join("\n")
}

export function designToJson(design: ExportableDesign): string {
  return JSON.stringify(
    {
      id: design.id,
      name: design.name,
      description: design.description,
      content: parsedContent(design)
    },
    null,
    2
  )
}

function safeFilename(name: string | undefined, ext: string): string {
  const base = (name ?? "design").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80)
  return `${base || "design"}.${ext}`
}

function triggerDownload(
  content: Blob | string,
  filename: string,
  mime: string
) {
  const blob =
    typeof content === "string" ? new Blob([content], { type: mime }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadMarkdown(design: ExportableDesign) {
  triggerDownload(
    designToMarkdown(design),
    safeFilename(design.name, "md"),
    "text/markdown;charset=utf-8"
  )
}

export function downloadJson(design: ExportableDesign) {
  triggerDownload(
    designToJson(design),
    safeFilename(design.name, "json"),
    "application/json;charset=utf-8"
  )
}

// ── Markdown-table-aware block parsing (for the PDF) ────────────────────────
export type PdfBlock =
  | { type: "text"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }

const isTableSeparatorRow = (line: string): boolean =>
  line.includes("-") && /^\s*\|?[\s:|-]+\|?\s*$/.test(line)

const splitTableCells = (line: string): string[] => {
  let s = line.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|")) s = s.slice(0, -1)
  return s.split("|").map(c => c.trim())
}

/**
 * Split a section body into text runs and markdown tables. Tolerant of the
 * model's slightly-malformed tables: a continuation line (no pipes, following a
 * row) is folded back into the previous row's last cell, and ragged rows are
 * padded / merged to the header's column count - so wide conditions / materials
 * tables render as real grids instead of mangled pipe-soup.
 */
export function parseMarkdownBlocks(body: string): PdfBlock[] {
  const lines = body.split("\n")
  const blocks: PdfBlock[] = []
  let buf: string[] = []
  const flush = () => {
    const t = buf.join("\n").trim()
    if (t) blocks.push({ type: "text", text: t })
    buf = []
  }
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i + 1] ?? ""
    if (line.includes("|") && isTableSeparatorRow(next)) {
      flush()
      const head = splitTableCells(line)
      const cols = head.length
      i += 2 // skip header + separator
      const rows: string[][] = []
      while (i < lines.length) {
        const l = lines[i]
        if (l.trim() === "") break
        const cells = splitTableCells(l)
        // A genuine row has >= 2 cells (>= 1 internal pipe). A continuation of a
        // wrapped cell yields a single cell - even if it carries the row's stray
        // trailing pipe - so fold it (sans pipe) into the last cell instead of
        // mistaking it for a new row.
        if (cells.length >= 2) {
          rows.push(cells)
        } else if (rows.length) {
          const last = rows[rows.length - 1]
          last[last.length - 1] =
            `${last[last.length - 1]} ${cells.join(" ")}`.trim()
        } else {
          head[head.length - 1] =
            `${head[head.length - 1]} ${cells.join(" ")}`.trim()
        }
        i++
      }
      const norm = rows.map(r =>
        r.length === cols
          ? r
          : r.length < cols
            ? [...r, ...Array(cols - r.length).fill("")]
            : [...r.slice(0, cols - 1), r.slice(cols - 1).join(" ")]
      )
      blocks.push({ type: "table", head, rows: norm })
    } else {
      buf.push(line)
      i++
    }
  }
  flush()
  return blocks
}

/**
 * Text-based PDF of the design (problem + each generated design's sections).
 * Uses jsPDF's text engine (real selectable text, proper margins + pagination)
 * rather than an html2canvas screenshot - neater, sharper, and it works off the
 * stored content so it needs no on-screen element/ref to capture. Markdown
 * tables are rendered as real tables via jspdf-autotable.
 */
export async function downloadDesignPdf(design: ExportableDesign) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ])
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const writeBlock = (
    text: string,
    opts: { size: number; bold?: boolean; gap?: number }
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal")
    doc.setFontSize(opts.size)
    const lineHeight = opts.size * 1.35
    for (const line of doc.splitTextToSize(text || " ", maxWidth)) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += opts.gap ?? 6
  }

  // Light markdown → readable plain text (keep table pipes for legibility).
  const stripMd = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/`{1,3}/g, "")

  const content = parsedContent(design) ?? {}

  writeBlock(design.name || content?.problem?.title || "Untitled design", {
    size: 18,
    bold: true,
    gap: 14
  })

  const probs = problemLines(content).map(stripMd)
  if (probs.length) {
    writeBlock("Research problem", { size: 13, bold: true, gap: 4 })
    probs.forEach(p => writeBlock(p, { size: 10.5, gap: 2 }))
    y += 8
  }

  const designs = Array.isArray(content.designs) ? content.designs : []
  if (designs.length === 0) {
    writeBlock("No generated design yet.", { size: 10.5 })
  }
  designs.forEach((d: any, di: number) => {
    if (di > 0) {
      doc.addPage()
      y = margin
    }
    writeBlock(d.title || "Design", { size: 15, bold: true, gap: 8 })
    ;(Array.isArray(d.sections) ? d.sections : []).forEach((s: any) => {
      writeBlock(s.heading, { size: 13, bold: true, gap: 4 })
      const blocks = parseMarkdownBlocks(s.body || "")
      if (blocks.length === 0) {
        writeBlock("-", { size: 10.5, gap: 10 })
      }
      for (const block of blocks) {
        if (block.type === "text") {
          const t = stripMd(block.text).trim()
          if (t) writeBlock(t, { size: 10.5, gap: 10 })
        } else {
          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            tableWidth: maxWidth,
            head: [block.head.map(stripMd)],
            body: block.rows.map(r => r.map(stripMd)),
            styles: {
              fontSize: 8,
              cellPadding: 3,
              overflow: "linebreak",
              valign: "top",
              lineColor: [220, 220, 220],
              lineWidth: 0.5
            },
            headStyles: {
              fillColor: [243, 243, 243],
              textColor: 30,
              fontStyle: "bold"
            }
          })
          const finalY = (doc as any).lastAutoTable?.finalY
          y = (typeof finalY === "number" ? finalY : y) + 14
        }
      }
      y += 4
    })
  })

  doc.save(safeFilename(design.name, "pdf"))
}

// ── Focused, downloadable artifacts (the design Overview "Create" actions) ───
// Three role-specific PDFs built from SUBSETS of the design's sections:
//  • Bench execution guide - the executable setup work (materials, calcs,
//    prep, method) + a conditions overview. No rationale/citations.
//  • Rationale & citations - literature, citations and the hypothesis rationale
//    + a conditions overview only. No materials/calcs/methods.
//  • SOP - a replicable protocol: short theory/rationale, then materials /
//    methods / execution + safety + disposal.
// Heading allow-lists are matched case-insensitively and include BOTH the new
// streamlined headings and the older ones, so the artifacts work for designs
// generated before the section refactor too.

interface ArtifactSpec {
  fileSuffix: string
  docTitle: string
  subtitle: string
  includeProblem?: boolean
  includeHypotheses?: "full" | "short" | false
  includeLiterature?: boolean
  /** Ordered, case-insensitive heading allow-list. */
  sectionHeadings: string[]
  /** Headings whose body is truncated (e.g. "rationale in short" for the SOP). */
  shortSections?: string[]
  shortLimit?: number
}

const normHeading = (s: string) =>
  (s || "").trim().toLowerCase().replace(/\s+/g, " ")

async function renderArtifactPdf(design: ExportableDesign, spec: ArtifactSpec) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ])
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const writeBlock = (
    text: string,
    opts: { size: number; bold?: boolean; gap?: number; color?: number }
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal")
    doc.setFontSize(opts.size)
    doc.setTextColor(opts.color ?? 20)
    const lineHeight = opts.size * 1.35
    for (const line of doc.splitTextToSize(text || " ", maxWidth)) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += opts.gap ?? 6
  }

  const stripMd = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/`{1,3}/g, "")

  const renderBody = (body: string) => {
    const blocks = parseMarkdownBlocks(body || "")
    if (blocks.length === 0) {
      writeBlock("-", { size: 10.5, gap: 8 })
      return
    }
    for (const block of blocks) {
      if (block.type === "text") {
        const t = stripMd(block.text).trim()
        if (t) writeBlock(t, { size: 10.5, gap: 9 })
      } else {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          tableWidth: maxWidth,
          head: [block.head.map(stripMd)],
          body: block.rows.map(r => r.map(stripMd)),
          styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: "linebreak",
            valign: "top",
            lineColor: [220, 220, 220],
            lineWidth: 0.5
          },
          headStyles: {
            fillColor: [243, 243, 243],
            textColor: 30,
            fontStyle: "bold"
          }
        })
        const finalY = (doc as any).lastAutoTable?.finalY
        y = (typeof finalY === "number" ? finalY : y) + 14
      }
    }
  }

  const content = parsedContent(design) ?? {}

  writeBlock(spec.docTitle, { size: 18, bold: true, gap: 3 })
  writeBlock(design.name || content?.problem?.title || "Untitled design", {
    size: 11,
    gap: 2,
    color: 90
  })
  writeBlock(spec.subtitle, { size: 9.5, gap: 14, color: 120 })

  if (spec.includeProblem) {
    const probs = problemLines(content).map(stripMd)
    if (probs.length) {
      writeBlock("Research problem", { size: 13, bold: true, gap: 4 })
      probs.forEach(p => writeBlock(p, { size: 10.5, gap: 2 }))
      y += 8
    }
  }

  if (spec.includeHypotheses) {
    const hyps = Array.isArray(content?.hypotheses) ? content.hypotheses : []
    const selected = hyps.filter((h: any) => h.selected)
    const use = selected.length ? selected : hyps
    if (use.length) {
      writeBlock("Hypotheses", { size: 13, bold: true, gap: 4 })
      use.forEach((h: any, i: number) => {
        writeBlock(`${i + 1}. ${h.text ?? ""}`, { size: 10.5, gap: 2 })
        if (spec.includeHypotheses === "full" && h.reasoning)
          writeBlock(stripMd(h.reasoning), { size: 9.5, gap: 4, color: 90 })
      })
      y += 8
    }
  }

  if (spec.includeLiterature) {
    const lit = literatureLines(content).map(stripMd)
    if (lit.length) {
      lit.forEach((l, i) =>
        writeBlock(l, { size: i === 0 ? 13 : 10, bold: i === 0, gap: 2 })
      )
      y += 8
    }
  }

  const shortSet = new Set((spec.shortSections ?? []).map(normHeading))
  const limit = spec.shortLimit ?? 800
  const designs = Array.isArray(content.designs) ? content.designs : []
  if (designs.length === 0) {
    writeBlock("No generated design yet.", { size: 10.5 })
  }
  designs.forEach((d: any, di: number) => {
    const secs = Array.isArray(d.sections) ? d.sections : []
    const ordered = spec.sectionHeadings
      .map(h =>
        secs.find((s: any) => normHeading(s.heading) === normHeading(h))
      )
      .filter(Boolean)
    if (ordered.length === 0) return
    if (designs.length > 1) {
      if (di > 0) {
        doc.addPage()
        y = margin
      }
      writeBlock(d.title || "Design", { size: 15, bold: true, gap: 8 })
    }
    ordered.forEach((s: any) => {
      writeBlock(s.heading, { size: 13, bold: true, gap: 4 })
      let body = s.body || ""
      if (shortSet.has(normHeading(s.heading)) && body.length > limit) {
        body = body.slice(0, limit).trimEnd() + " …"
      }
      renderBody(body)
      y += 4
    })
  })

  doc.save(safeFilename(`${design.name || "design"}-${spec.fileSuffix}`, "pdf"))
}

export function downloadBenchExecutionGuide(design: ExportableDesign) {
  return renderArtifactPdf(design, {
    fileSuffix: "bench-execution-guide",
    docTitle: "Bench Execution Guide",
    subtitle:
      "Executable setup work - materials, calculations, preparation and method - for the design conditions below.",
    sectionHeadings: [
      "Conditions Table",
      "Tools & Equipment",
      "Materials List",
      "Material Preparation",
      "Setup Instructions",
      "Step-by-Step Procedure",
      "Data Collection Plan",
      "Timeline",
      "Storage & Disposal"
    ]
  })
}

export function downloadRationaleCitations(design: ExportableDesign) {
  return renderArtifactPdf(design, {
    fileSuffix: "rationale-and-citations",
    docTitle: "Rationale & Citations",
    subtitle:
      "Why this design - literature, citations and the hypothesis rationale - with a conditions overview. No materials or methods.",
    includeProblem: true,
    includeHypotheses: "full",
    includeLiterature: true,
    sectionHeadings: ["Conditions Table", "Rationale"]
  })
}

export function downloadSOP(design: ExportableDesign) {
  return renderArtifactPdf(design, {
    fileSuffix: "sop",
    docTitle: "Standard Operating Procedure (SOP)",
    subtitle:
      "A replicable protocol: brief theory and rationale, then materials, methods, execution, safety and disposal.",
    includeProblem: true,
    includeHypotheses: "short",
    sectionHeadings: [
      "Rationale",
      "Groups & Controls",
      "Conditions Table",
      "Sample Types",
      "Special Requirements",
      "Tools & Equipment",
      "Materials List",
      "Material Preparation",
      "Setup Instructions",
      "Step-by-Step Procedure",
      "Timeline",
      "Safety Notes",
      "Storage & Disposal"
    ],
    shortSections: ["Rationale"],
    shortLimit: 900
  })
}

// High-level summary: problem + selected hypothesis + the experimental
// conditions, no methods/materials detail. The "at a glance" artifact.
export function downloadOverview(design: ExportableDesign) {
  return renderArtifactPdf(design, {
    fileSuffix: "overview",
    docTitle: "Design Overview",
    subtitle:
      "A high-level summary of the problem, hypothesis and experimental conditions.",
    includeProblem: true,
    includeHypotheses: "short",
    sectionHeadings: ["Groups & Controls", "Conditions Table", "Sample Types"]
  })
}

// Just the shopping list: reagents, materials and equipment to run the design.
export function downloadMaterialList(design: ExportableDesign) {
  return renderArtifactPdf(design, {
    fileSuffix: "material-list",
    docTitle: "Materials & Equipment List",
    subtitle:
      "Reagents, materials and equipment required to run this experiment.",
    sectionHeadings: [
      "Tools & Equipment",
      "Materials List",
      "Material Preparation"
    ]
  })
}
