#!/usr/bin/env node
// List currently-deployed Firestore composite indexes for the project.
// Uses the service-account creds from .env.local - listing only requires
// the runtime "Cloud Datastore User" role, which the existing SA has.

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

const client = await auth.getClient()
const tokenResponse = await client.getAccessToken()
const token = tokenResponse.token

const collections = ["designs", "projects", "data_collections", "chats"]
for (const collection of collections) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/${collection}/indexes`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })
  console.log(`\n=== ${collection} (HTTP ${res.status}) ===`)
  const json = await res.json()
  for (const idx of json.indexes ?? []) {
    if (idx.queryScope !== "COLLECTION") continue
    const fields = (idx.fields ?? [])
      .filter(f => f.fieldPath !== "__name__")
      .map(f => `${f.fieldPath} ${f.order ?? f.arrayConfig}`)
      .join(", ")
    console.log(`  ${idx.state ?? "?"}: ${fields}`)
  }
}
