#!/usr/bin/env node
// Create a single Firestore composite index. Usage:
//   node scripts/create-firestore-index.mjs <collection> <fieldspec...>
// fieldspec format: "fieldPath:asc" or "fieldPath:desc"
// Example:
//   node scripts/create-firestore-index.mjs projects workspace_id:asc updated_at:desc

import { readFileSync } from "node:fs"
import { GoogleAuth } from "google-auth-library"

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

const [, , collection, ...specs] = process.argv
if (!collection || specs.length === 0) {
  console.error(
    "Usage: node scripts/create-firestore-index.mjs <collection> <field:asc|desc>..."
  )
  process.exit(1)
}

const fields = specs.map(s => {
  const [fieldPath, dir] = s.split(":")
  return {
    fieldPath,
    order: dir === "desc" ? "DESCENDING" : "ASCENDING"
  }
})

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n"
)

const auth = new GoogleAuth({
  credentials: { client_email: clientEmail, private_key: privateKey },
  scopes: ["https://www.googleapis.com/auth/datastore"]
})

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/${collection}/indexes`

const client = await auth.getClient()
const tokenResponse = await client.getAccessToken()
const token = tokenResponse.token

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ queryScope: "COLLECTION", fields })
})

const body = await res.text()
console.log(`HTTP ${res.status}`)
console.log(body)
process.exit(res.ok || res.status === 409 ? 0 : 1)
