import { test, expect } from "@playwright/test"

test("home screen loads", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Start Learning" }).click()
  await expect(page).toHaveURL(/.*\/chat/, { timeout: 20000 })
  await expect(page.getByRole("button", { name: "New topic" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Learntime" })).toBeVisible()

  await page.keyboard.press("ControlOrMeta+Shift+/")

  await expect(
    page.getByRole("menuitem", { name: "Show Help ⌘ Shift /" })
  ).toBeVisible()
})
