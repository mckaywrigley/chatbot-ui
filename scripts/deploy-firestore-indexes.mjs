#!/usr/bin/env node
// One-shot helper: build a service-account JSON from env vars in .env.local
// and run `firebase deploy --only firestore:indexes` with it. The temp file
// is unlinked at the end whether the deploy succeeds or fails.

import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

function loadDotEnv(path) {
  let raw
  try {
    raw = readFileSync(path, "utf8")
  } catch {
    return
  }
  for (const line of raw.split("\n")) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim())
    if (!m) continue
    let [, k, v] = m
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadDotEnv(".env.local")

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n"
)

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local"
  )
  process.exit(1)
}

const sa = {
  type: "service_account",
  project_id: projectId,
  private_key: privateKey,
  client_email: clientEmail,
  token_uri: "https://oauth2.googleapis.com/token"
}

const dir = mkdtempSync(join(tmpdir(), "fb-sa-"))
const credPath = join(dir, "sa.json")
writeFileSync(credPath, JSON.stringify(sa), { mode: 0o600 })

try {
  const result = spawnSync(
    "firebase",
    ["deploy", "--only", "firestore:indexes", "--project", projectId],
    {
      stdio: "inherit",
      env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: credPath }
    }
  )
  process.exit(result.status ?? 1)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
