#!/usr/bin/env node
/**
 * Turns Playwright's JSON report into the nightly email.
 *
 * Written as plain ESM with no dependencies so it runs even when the test run
 * itself blew up - a reporting script that needs the app's build to work is a
 * reporting script that goes quiet exactly when you need it.
 *
 * Always exits 0. Whether the night passed or failed is the test runner's
 * verdict, carried by ITS exit code; this script only has to deliver the news.
 */
import fs from "node:fs"
import path from "node:path"

const RESULTS = process.argv[2] || "e2e-results.json"
const TO = (process.env.QA_REPORT_TO || "").split(",").map(s => s.trim()).filter(Boolean)
const FROM = process.env.EMAIL_FROM_ADDRESS || "Shadow AI QA <notifications@shadowai.work>"
const API_KEY = process.env.RESEND_API_KEY
const RUN_URL = process.env.GITHUB_RUN_URL || ""
const TARGET = process.env.E2E_BASE_URL || "https://www.shadowai.work"

const esc = s =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

/** Flatten Playwright's nested suites into one list of specs. */
function collect(node, file, out) {
  for (const suite of node.suites ?? []) {
    collect(suite, suite.file || file, out)
  }
  for (const spec of node.specs ?? []) {
    const run = (spec.tests ?? [])[0] ?? {}
    const result = (run.results ?? [])[0] ?? {}
    out.push({
      file: path.basename(spec.file || file || ""),
      title: spec.title,
      ok: !!spec.ok,
      status: result.status || (spec.ok ? "passed" : "failed"),
      durationMs: result.duration || 0,
      error: result.error?.message || (result.errors ?? [])[0]?.message || ""
    })
  }
}

function load() {
  if (!fs.existsSync(RESULTS)) return null
  try {
    return JSON.parse(fs.readFileSync(RESULTS, "utf8"))
  } catch (e) {
    return null
  }
}

const report = load()
const specs = []
if (report) {
  for (const suite of report.suites ?? []) collect(suite, suite.file, specs)
}

const failed = specs.filter(s => !s.ok && s.status !== "skipped")
const skipped = specs.filter(s => s.status === "skipped")
const passed = specs.filter(s => s.ok && s.status !== "skipped")
const crashed = !report
const healthy = !crashed && failed.length === 0 && passed.length > 0

const totalMs = report?.stats?.duration ?? specs.reduce((a, s) => a + s.durationMs, 0)
const mins = (totalMs / 60000).toFixed(1)
const dur = ms => (ms >= 60000 ? `${(ms / 60000).toFixed(1)}m` : `${(ms / 1000).toFixed(0)}s`)

const subject = crashed
  ? "ShadowAI nightly QA - RUN DID NOT COMPLETE"
  : healthy
    ? `ShadowAI nightly QA - all ${passed.length} checks healthy`
    : `ShadowAI nightly QA - ${failed.length} FAILING`

const rows = specs
  .map(s => {
    const colour = s.status === "skipped" ? "#8a8a8a" : s.ok ? "#1F7A3D" : "#B3261E"
    const mark = s.status === "skipped" ? "skipped" : s.ok ? "pass" : "FAIL"
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${colour};font-weight:600;white-space:nowrap;">${mark}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;">${esc(s.title)}<div style="color:#888;font-size:11px;">${esc(s.file)}</div></td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;white-space:nowrap;">${dur(s.durationMs)}</td>
    </tr>`
  })
  .join("")

const failureDetail = failed.length
  ? `<h3 style="margin:24px 0 8px;color:#B3261E;">What broke</h3>` +
    failed
      .map(
        f => `<div style="margin:0 0 14px;">
            <div style="font-weight:600;">${esc(f.title)}</div>
            <pre style="white-space:pre-wrap;background:#faf6f6;border:1px solid #f0dcdc;padding:10px;border-radius:6px;font-size:12px;color:#5a2020;margin:6px 0 0;">${esc(f.error.slice(0, 1200))}</pre>
          </div>`
      )
      .join("")
  : ""

const banner = crashed
  ? { bg: "#5a2020", text: "The run did not produce a report - the job itself failed." }
  : healthy
    ? { bg: "#1F4A2C", text: `All ${passed.length} checks passed in ${mins} min.` }
    : { bg: "#7a2a22", text: `${failed.length} of ${specs.length - skipped.length} checks failed.` }

const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#222;">
  <div style="background:${banner.bg};color:#fff;padding:16px 18px;border-radius:10px;">
    <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;opacity:.8;">Shadow AI &middot; nightly QA</div>
    <div style="font-size:17px;font-weight:700;margin-top:4px;">${esc(banner.text)}</div>
  </div>
  <p style="color:#666;font-size:12.5px;margin:14px 0 6px;">
    Target: <a href="${esc(TARGET)}" style="color:#0b6;">${esc(TARGET)}</a>
    ${RUN_URL ? ` &middot; <a href="${esc(RUN_URL)}" style="color:#0b6;">CI run &amp; artefacts</a>` : ""}
    &middot; ${new Date().toUTCString()}
  </p>
  ${specs.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:10px;">${rows}</table>` : "<p>No results were recorded.</p>"}
  ${failureDetail}
  <p style="color:#999;font-size:11.5px;margin-top:28px;">
    Traces, screenshots and video for any failure are attached to the CI run as the <code>playwright-report</code> artefact.
  </p>
</div>`

const text = [
  subject,
  `Target: ${TARGET}`,
  RUN_URL ? `Run: ${RUN_URL}` : "",
  "",
  ...specs.map(s => `${s.status === "skipped" ? "SKIP" : s.ok ? "pass" : "FAIL"}  ${s.title}  (${dur(s.durationMs)})`),
  "",
  ...failed.map(f => `--- ${f.title}\n${f.error.slice(0, 800)}`)
]
  .filter(Boolean)
  .join("\n")

console.log(text)

if (!API_KEY || TO.length === 0) {
  console.warn(
    `[digest] not emailed - ${!API_KEY ? "RESEND_API_KEY missing" : "QA_REPORT_TO missing"}`
  )
  process.exit(0)
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from: FROM, to: TO, subject, html, text })
}).catch(e => ({ ok: false, status: 0, text: async () => String(e) }))

if (!res.ok) {
  console.error(`[digest] Resend failed: HTTP ${res.status} ${await res.text().catch(() => "")}`)
} else {
  console.log(`[digest] emailed to ${TO.join(", ")}`)
}
process.exit(0)
