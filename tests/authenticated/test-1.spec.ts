import { test, expect } from "@playwright/test"

test("test", async ({ page }) => {
  await page.goto("about:blank")
  await page.goto("chrome-error://chromewebdata/")
  await page.goto("http://localhost:3000/")
  await page.getByRole("link", { name: "Start Learning" }).click()
  await page.goto("http://localhost:3000/")
  await page.getByPlaceholder("you@example.com").click()
})
