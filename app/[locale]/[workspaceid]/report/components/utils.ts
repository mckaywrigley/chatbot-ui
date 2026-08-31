"use client"
import PptxGenJS from "pptxgenjs"

export function getIntroSlide(pptx: PptxGenJS, title: string) {
  let slide = pptx.addSlide()
  slide.background = { color: "0070C0" }
  // Add a title
  slide.addText(title, {
    x: 0, // Center horizontally
    y: 2.16667, // Center vertically
    w: "100%", // Width of the text box to span the entire slide width
    h: 1,
    fontSize: 72,
    color: "ffffff",
    fontFace: "Calibri",
    align: "center",
    valign: "middle"
  })
}

export function getContentSlide(
  pptx: PptxGenJS,
  title: string,
  content: string
) {
  let slide = pptx.addSlide()
  slide.background = { color: "f0d3dc" }
  slide.addText(title, {
    x: 0.2,
    y: 0.2,
    h: 1,
    w: "100%",
    fontSize: 24,
    color: "000000",
    fontFace: "Calibri",
    align: pptx.AlignH.left,
    valign: pptx.AlignV.top
  })

  slide.addText(content, {
    x: 0.2,
    y: 0.8,
    h: 1,
    w: "90%",
    fontSize: 16,
    color: "000000",
    fontFace: "Calibri",
    align: pptx.AlignH.left,
    valign: pptx.AlignV.top
  })
}
