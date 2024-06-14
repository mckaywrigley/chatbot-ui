import { test, expect } from "@playwright/test"

test("home screen loads", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Start Learning" }).click()
  await expect(page).toHaveURL(/.*\/chat/)
  await expect(page.getByRole("button", { name: "New topic" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Learntime" })).toBeVisible()
})
test("help popup opens", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Start Learning" }).click()

  await page.locator('[id="radix-\\:rl\\:"]').click()
  await expect(
    page.getByRole("menuitem", { name: "Show Help ⌘ Shift /" })
  ).toBeVisible()
})
