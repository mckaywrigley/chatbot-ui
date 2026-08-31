/**
 * Authentication health.
 *
 * Signup is tested with a real, throwaway account and deleted afterwards -
 * a broken signup is the one failure that costs you every new user, and it is
 * not observable from an already-signed-in session.
 */
import { test, expect } from "@playwright/test"
import { env, canAdminister } from "../utils/env"
import { deleteUserByEmail } from "../utils/supabase-admin"

test.describe("auth", () => {
  test("login page renders and rejects a bad password", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()

    await page.fill("#email", env.email)
    await page.fill('input[name="password"]', "definitely-not-the-password")
    await page.getByRole("button", { name: /sign in/i }).click()

    // Must stay unauthenticated. The specific copy is Supabase's and may be
    // reworded, so assert on the outcome (still on /login) rather than the text.
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/login")
  })

  test("a real user can sign up and lands in a workspace", async ({ page }) => {
    // Unique per run so consecutive nights never collide.
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e4)}`
    const email = `qa+${stamp}@${env.signupDomain}`
    const password = `Qa!${stamp}aA1`

    try {
      await page.goto("/signup")
      await page.fill("#full_name", "Nightly QA")
      await page.fill("#email", email)
      await page.fill('input[name="password"]', password)

      // Terms checkbox is required to submit.
      const terms = page.locator('input[type="checkbox"]').first()
      if (await terms.isVisible().catch(() => false)) {
        await terms.check().catch(() => {})
      }

      await page.getByRole("button", { name: /sign up|create account/i }).click()

      // Either we land in a workspace, or the app asks for email confirmation.
      // Both mean signup itself worked; only an error on the form does not.
      await page.waitForLoadState("networkidle", { timeout: 60_000 })
      const url = page.url()
      const landedInWorkspace = /\/[^/]+\/[0-9a-f-]{36}(\/|$)/i.test(url)
      const bodyText = (await page.textContent("body")) ?? ""
      const asksForConfirmation = /check your (email|inbox)|confirm/i.test(bodyText)

      expect(
        landedInWorkspace || asksForConfirmation,
        `Signup did not complete. URL=${url} body="${bodyText.slice(0, 300)}"`
      ).toBeTruthy()
    } finally {
      // Always clean up, including when the assertion above failed - a failed
      // signup can still have created the auth row.
      if (canAdminister()) {
        const res = await deleteUserByEmail(email)
        console.log(
          `[cleanup] ${email}: ${res.deleted ? "deleted" : `not deleted (${res.reason})`}`
        )
      } else {
        console.warn(
          `[cleanup] SUPABASE_SERVICE_ROLE_KEY not set - ${email} left behind`
        )
      }
    }
  })
})
