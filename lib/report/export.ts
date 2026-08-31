import jsPDF from "jspdf"
import pptxgen from "pptxgenjs"

type Draft = Record<string, any>

export type ExportSection = {
  key: string
  title: string
  group: string
}

/**
 * Strip markdown formatting from prose so it lays out cleanly inside
 * jsPDF / pptxgen text boxes. Tables are deliberately NOT touched here
 * - they're parsed out earlier so we can render them as actual tables
 * (the scientist flagged that pipe-tables were getting spaced out into
 * unreadable rows in both exports - that was the old code rewriting
 * `|` to two spaces and letting jsPDF wrap-text break the alignment).
 */
const stripMarkdown = (md: string): string => {
  if (!md) return ""
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, m => m)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^-{3,}\s*$/gm, "")
    .trim()
}

/**
 * Segment a markdown body into a sequence of text / table chunks so
 * exporters can render each correctly. Tables are detected by the
 * GitHub-style `| col | col |` + `| --- | --- |` separator.
 *
 * Output is ordered - callers can iterate and emit a paragraph block
 * for "text" segments and a real table for "table" segments.
 */
type TextSegment = { type: "text"; content: string }
type TableSegment = { type: "table"; header: string[]; rows: string[][] }
type Segment = TextSegment | TableSegment

const splitContentByTables = (markdown: string): Segment[] => {
  if (!markdown) return []
  const lines = markdown.split("\n")
  const segments: Segment[] = []
  let buffer: string[] = []

  const flushText = () => {
    const text = buffer.join("\n").trim()
    if (text) segments.push({ type: "text", content: text })
    buffer = []
  }

  const isTableRow = (line: string) => /^\s*\|.+\|\s*$/.test(line)
  const isSeparator = (line: string) =>
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1] ?? ""
    if (isTableRow(line) && isSeparator(nextLine)) {
      flushText()
      // Collect header + separator + body rows until a non-table line.
      const headerCells = splitTableRow(line)
      i += 2 // skip separator
      const bodyRows: string[][] = []
      while (i < lines.length && isTableRow(lines[i])) {
        bodyRows.push(splitTableRow(lines[i]))
        i++
      }
      i-- // last loop step undoes the i++ on the for
      segments.push({ type: "table", header: headerCells, rows: bodyRows })
      continue
    }
    buffer.push(line)
  }
  flushText()
  return segments
}

const splitTableRow = (row: string): string[] =>
  row
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map(cell => cell.trim())

const contentOf = (draft: Draft | null, key: string): string => {
  const raw = draft?.[key]
  if (typeof raw === "string") return raw
  return raw ? JSON.stringify(raw, null, 2) : ""
}

const loadChartImage = async (
  src: string
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  if (!src) return null
  try {
    if (src.startsWith("data:")) {
      return await new Promise(resolve => {
        const img = new Image()
        img.onload = () =>
          resolve({
            dataUrl: src,
            width: img.naturalWidth,
            height: img.naturalHeight
          })
        img.onerror = () => resolve(null)
        img.src = src
      })
    }
    const res = await fetch(src)
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
    return await new Promise(resolve => {
      const img = new Image()
      img.onload = () =>
        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight
        })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
  } catch {
    return null
  }
}

export const exportReportToPDF = async ({
  title,
  draft,
  sections,
  chartImage
}: {
  title: string
  draft: Draft | null
  sections: ExportSection[]
  chartImage: string | null
}) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const writeTitle = (text: string, size: number, bold = true) => {
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, contentWidth) as string[]
    ensureSpace(lines.length * size * 1.2)
    lines.forEach(line => {
      doc.text(line, margin, y)
      y += size * 1.2
    })
    y += 6
  }

  const writeParagraph = (text: string) => {
    if (!text) return
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    const clean = stripMarkdown(text)
    const paragraphs = clean.split(/\n{2,}/)
    paragraphs.forEach(p => {
      // Per-paragraph: collapse internal single-line breaks into spaces
      // so jsPDF's wrap kicks in on whole sentences (was the source of
      // the "weird gaps for alignment" the scientist flagged - explicit
      // newlines from the LLM were being preserved verbatim).
      const collapsed = p.replace(/\s*\n\s*/g, " ").trim()
      const lines = doc.splitTextToSize(collapsed, contentWidth) as string[]
      lines.forEach(line => {
        ensureSpace(16)
        doc.text(line, margin, y)
        y += 15
      })
      y += 8
    })
  }

  /**
   * Manual table renderer - draws header row + body rows with even
   * column widths, wrapping cell text per cell. Borders 0.5pt. Adds
   * page breaks between rows so a long table doesn't clip.
   */
  const writeTable = (header: string[], rows: string[][]) => {
    if (header.length === 0) return
    const colCount = header.length
    const colW = contentWidth / colCount
    const cellPaddingX = 6
    const cellPaddingY = 4
    const headerFontSize = 10
    const bodyFontSize = 10
    const lineHeight = 13

    const measureRowHeight = (cells: string[], fontSize: number) => {
      doc.setFontSize(fontSize)
      let max = 0
      cells.forEach(cell => {
        const lines = doc.splitTextToSize(
          stripMarkdown(cell || ""),
          colW - cellPaddingX * 2
        ) as string[]
        max = Math.max(max, lines.length)
      })
      return max * lineHeight + cellPaddingY * 2
    }

    const drawRow = (
      cells: string[],
      fontSize: number,
      bold: boolean,
      bg?: [number, number, number]
    ) => {
      const rowH = measureRowHeight(cells, fontSize)
      ensureSpace(rowH)
      const rowY = y

      // Fill background
      if (bg) {
        doc.setFillColor(bg[0], bg[1], bg[2])
        doc.rect(margin, rowY, contentWidth, rowH, "F")
      }
      // Border + text per cell
      doc.setDrawColor(180)
      doc.setLineWidth(0.5)
      doc.setFont("helvetica", bold ? "bold" : "normal")
      doc.setFontSize(fontSize)
      doc.setTextColor(20)
      cells.forEach((cell, i) => {
        const cellX = margin + i * colW
        doc.rect(cellX, rowY, colW, rowH)
        const lines = doc.splitTextToSize(
          stripMarkdown(cell || ""),
          colW - cellPaddingX * 2
        ) as string[]
        lines.forEach((line, li) => {
          doc.text(
            line,
            cellX + cellPaddingX,
            rowY + cellPaddingY + lineHeight * (li + 1) - 3
          )
        })
      })
      y += rowH
    }

    drawRow(header, headerFontSize, true, [235, 238, 242])
    rows.forEach(row => {
      const padded = [...row]
      while (padded.length < colCount) padded.push("")
      drawRow(padded.slice(0, colCount), bodyFontSize, false)
    })
    y += 8
  }

  // Title page header
  writeTitle(title || "Report", 22)
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 18

  // Group sections
  const grouped = sections.reduce<Record<string, ExportSection[]>>((acc, s) => {
    acc[s.group] = acc[s.group] || []
    acc[s.group].push(s)
    return acc
  }, {})

  for (const group of Object.keys(grouped)) {
    writeTitle(group, 16)
    for (const section of grouped[group]) {
      const content = contentOf(draft, section.key)
      if (!content && section.key !== "dataAnalysis") continue
      writeTitle(section.title, 13)

      // Split into prose + tables so each renders correctly.
      const segments = splitContentByTables(content)
      if (segments.length === 0 && content) {
        writeParagraph(content)
      } else {
        for (const seg of segments) {
          if (seg.type === "text") writeParagraph(seg.content)
          else writeTable(seg.header, seg.rows)
        }
      }

      // Embed chart within Data Analysis
      if (section.key === "dataAnalysis" && chartImage) {
        const img = await loadChartImage(chartImage)
        if (img) {
          const maxW = contentWidth
          const ratio = img.height / img.width
          const w = maxW
          const h = w * ratio
          ensureSpace(h + 10)
          doc.addImage(img.dataUrl, "PNG", margin, y, w, h)
          y += h + 10
        }
      }
    }
  }

  doc.save(`${title || "report"}.pdf`)
}

export const exportReportToPPTX = async ({
  title,
  draft,
  sections,
  chartImage
}: {
  title: string
  draft: Draft | null
  sections: ExportSection[]
  chartImage: string | null
}) => {
  const pptx = new pptxgen()
  pptx.layout = "LAYOUT_WIDE"

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: "FFFFFF" }
  titleSlide.addText(title || "Report", {
    x: 0.5,
    y: 2.5,
    w: 12,
    h: 1.5,
    fontSize: 40,
    bold: true,
    color: "1F2937",
    align: "center"
  })
  titleSlide.addText("Generated Report", {
    x: 0.5,
    y: 4.0,
    w: 12,
    h: 0.6,
    fontSize: 18,
    color: "6B7280",
    align: "center"
  })

  // Add a content slide for prose chunks; emit a separate slide for
  // each table so the table has room to breathe (PowerPoint table cells
  // shrink badly when crammed alongside body text on a single slide).
  const addProseSlide = (
    sectionGroup: string,
    sectionTitle: string,
    text: string
  ) => {
    const slide = pptx.addSlide()
    slide.background = { color: "FFFFFF" }
    slide.addText(sectionGroup.toUpperCase(), {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: "6B7280"
    })
    slide.addText(sectionTitle, {
      x: 0.5,
      y: 0.55,
      w: 12,
      h: 0.6,
      fontSize: 26,
      bold: true,
      color: "111827"
    })
    slide.addText(stripMarkdown(text), {
      x: 0.5,
      y: 1.3,
      w: 12,
      h: 5.8,
      fontSize: 13,
      color: "1F2937",
      valign: "top"
    })
  }

  const addTableSlide = (
    sectionGroup: string,
    sectionTitle: string,
    header: string[],
    body: string[][]
  ) => {
    const slide = pptx.addSlide()
    slide.background = { color: "FFFFFF" }
    slide.addText(sectionGroup.toUpperCase(), {
      x: 0.5,
      y: 0.3,
      w: 12,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: "6B7280"
    })
    slide.addText(sectionTitle, {
      x: 0.5,
      y: 0.55,
      w: 12,
      h: 0.6,
      fontSize: 26,
      bold: true,
      color: "111827"
    })

    // Build pptxgen table rows with explicit cell options so headers
    // are bold + filled. Without per-cell styling pptxgenjs ignores
    // the table border defaults and renders an unstyled blob.
    const headerRow = header.map(h => ({
      text: h,
      options: {
        bold: true,
        fill: { color: "EEF2F6" },
        color: "111827",
        align: "left" as const
      }
    }))
    const bodyRows = body.map(row =>
      row.map(cell => ({
        text: stripMarkdown(cell),
        options: { color: "1F2937", align: "left" as const }
      }))
    )
    slide.addTable([headerRow, ...bodyRows], {
      x: 0.5,
      y: 1.3,
      w: 12,
      colW: header.map(() => 12 / header.length),
      fontSize: 11,
      border: { type: "solid", color: "B7C0CC", pt: 0.5 },
      autoPage: true,
      autoPageHeaderRows: 1,
      newSlideStartY: 1.3
    })
  }

  for (const section of sections) {
    const content = contentOf(draft, section.key)
    const segments = splitContentByTables(content)
    const hasContent =
      !!content || (section.key === "dataAnalysis" && !!chartImage)
    if (!hasContent && segments.length === 0) continue

    if (section.key === "dataAnalysis" && chartImage) {
      // Chart slide: prose left + chart image right (as before, but
      // with table content also exported on follow-on slides).
      const proseText = segments
        .filter((s): s is TextSegment => s.type === "text")
        .map(s => s.content)
        .join("\n\n")
      const slide = pptx.addSlide()
      slide.background = { color: "FFFFFF" }
      slide.addText(section.group.toUpperCase(), {
        x: 0.5,
        y: 0.3,
        w: 12,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: "6B7280"
      })
      slide.addText(section.title, {
        x: 0.5,
        y: 0.55,
        w: 12,
        h: 0.6,
        fontSize: 26,
        bold: true,
        color: "111827"
      })
      slide.addText(stripMarkdown(proseText.slice(0, 1400)), {
        x: 0.5,
        y: 1.3,
        w: 6,
        h: 5.8,
        fontSize: 12,
        color: "1F2937",
        valign: "top"
      })
      slide.addImage({ data: chartImage, x: 7, y: 1.3, w: 5.8, h: 5.0 })

      // Any tables embedded inside data-analysis content - emit on
      // dedicated follow-up slides so they actually fit.
      segments
        .filter((s): s is TableSegment => s.type === "table")
        .forEach(t =>
          addTableSlide(section.group, section.title, t.header, t.rows)
        )
      continue
    }

    if (segments.length === 0) {
      addProseSlide(section.group, section.title, content)
      continue
    }

    let firstProseEmitted = false
    for (const seg of segments) {
      if (seg.type === "text") {
        if (!firstProseEmitted) {
          addProseSlide(section.group, section.title, seg.content)
          firstProseEmitted = true
        } else {
          addProseSlide(section.group, `${section.title} (cont.)`, seg.content)
        }
      } else {
        addTableSlide(section.group, section.title, seg.header, seg.rows)
      }
    }
  }

  await pptx.writeFile({ fileName: `${title || "report"}.pptx` })
}
