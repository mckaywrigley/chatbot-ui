import { test as setup, expect } from "@playwright/test"

console.log("Running setup test")

const authFile = "playwright/.auth/user.json"

setup("authenticate", async ({ page }) => {
  console.log("Running setup test2")
  // Perform authentication steps. Replace these actions with your own.
  await page.goto("/login")
  await page.getByPlaceholder("you@example.com").fill("test@learntime.ai")
  await page.getByPlaceholder("••••••••").fill("1qasw23ed")
  await page.getByRole("button", { name: "Login" }).click()

  await page.waitForURL("**/chat")
  // Alternatively, you can wait until the page reaches a state where all cookies are set.
  //   await expect(page.getByRole("button", { name: "New topic" })).toBeVisible()

  // End of authentication steps.

  await page.context().storageState({ path: authFile })
})
