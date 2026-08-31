/**
 * Signs in once and hands the session to every downstream project.
 *
 * Also records the workspace id, which is not knowable up front: the app
 * resolves it in middleware and expresses it only in the redirect URL. Every
 * later API call needs it, so it is captured here rather than rediscovered.
 */
import { test as setup, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { env } from "./utils/env"

const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth")
const STATE_FILE = path.join(AUTH_DIR, "user.json")
const CONTEXT_FILE = path.join(AUTH_DIR, "context.json")

setup("sign in and capture workspace", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  await page.goto("/login")
  await page.fill("#email", env.email)
  await page.fill('input[name="password"]', env.password)
  await page.getByRole("button", { name: /sign in/i }).click()

  // A successful sign-in bounces through "/" and lands on the workspace.
  // Anything else - a wrong password, a Supabase outage - leaves us on /login
  // with an error, so assert on the destination rather than on absence of error.
  await page.waitForURL(/\/[^/]+\/[0-9a-f-]{36}(\/|$)/i, { timeout: 60_000 })

  const match = page.url().match(/\/([0-9a-f-]{36})(?:\/|$)/i)
  expect(
    match,
    `Signed in but could not read a workspace id out of ${page.url()}`
  ).toBeTruthy()

  const workspaceId = match![1]
  const locale = new URL(page.url()).pathname.split("/").filter(Boolean)[0]

  await page.context().storageState({ path: STATE_FILE })
  fs.writeFileSync(
    CONTEXT_FILE,
    JSON.stringify({ workspaceId, locale, capturedAt: new Date().toISOString() }, null, 2)
  )

  console.log(`[setup] signed in; workspace=${workspaceId} locale=${locale}`)
})
