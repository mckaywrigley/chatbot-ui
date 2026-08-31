/**
 * Workspace + design creation, driven through the UI.
 *
 * This is the layer the pipeline spec deliberately skips: that one asserts the
 * science still works, this one asserts a human can actually get to it.
 */
import { test, expect } from "@playwright/test"
import { qaContext } from "../utils/context"
import { createDesign, deleteDesign } from "../utils/app-api"

test.use({ storageState: "e2e/.auth/user.json" })

test.describe("workspace", () => {
  test("dashboard loads for a signed-in user", async ({ page }) => {
    const { workspaceId, locale } = qaContext()
    await page.goto(`/${locale}/${workspaceId}`)

    // Not redirected back to login - i.e. the session is genuinely valid.
    await page.waitForLoadState("domcontentloaded")
    expect(page.url()).not.toContain("/login")

    // Assert on the dashboard's own furniture rather than "a page rendered":
    // an error boundary renders a page too. Matched on text rather than a
    // heading role so a restyle doesn't turn a healthy night red - the point
    // is that the workspace shell mounted with its content, not its markup.
    await expect(page.getByText(/designs?/i).first()).toBeVisible({
      timeout: 30_000
    })
    // And that we are not looking at an error boundary.
    const body = (await page.textContent("body")) ?? ""
    expect(
      /something went wrong|application error|unhandled/i.test(body),
      "the dashboard rendered an error boundary"
    ).toBeFalsy()
  })

  test("a design can be created and opened", async ({ page, request }) => {
    const { workspaceId, locale } = qaContext()
    const name = `QA smoke ${new Date().toISOString()}`
    let designId: string | null = null

    try {
      designId = await createDesign(request, workspaceId, name)
      expect(designId).toBeTruthy()

      await page.goto(`/${locale}/${workspaceId}/designs/${designId}`)
      await page.waitForLoadState("domcontentloaded")

      // The design page must actually mount its stage rail, not just return 200.
      await expect(
        page.getByText(/problem/i).first()
      ).toBeVisible({ timeout: 45_000 })
      expect(page.url()).toContain(designId)
    } finally {
      if (designId) await deleteDesign(request, designId)
    }
  })
})
