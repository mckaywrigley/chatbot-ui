import { test, expect } from "@playwright/test"

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } })

test("start learning is displayed", async ({ page }) => {
  await page.goto("/")

  //expect the start learning link to be visible
  await expect(page.getByRole("link", { name: "Start Learning" })).toBeVisible()
})

test("No password error message", async ({ page }) => {
  await page.goto("/login")
  //fill in dummy email
  await page.getByPlaceholder("you@example.com").fill("dummyemail@gmail.com")
  await page.getByRole("button", { name: "Login" }).click()
  //wait for netwrok to be idle
  await page.waitForLoadState("networkidle")
  //validate that correct message is shown to the user
  await expect(page.getByText("Invalid login credentials")).toBeVisible()
})

test("No password for signup", async ({ page }) => {
  await page.goto("/login")

  await page
    .getByPlaceholder("you@example.com")
    .fill("review_jumbos0m@icloud.com")
  await page.getByRole("button", { name: "Sign Up" }).click()
  //validate appropriate error is thrown for missing password when signing up
  await expect(page.getByText("Signup requires a valid")).toBeVisible()
})

test("password reset message", async ({ page }) => {
  await page.goto("/login")
  await page.getByPlaceholder("you@example.com").fill("demo@gmail.com")
  await page.getByRole("button", { name: "Reset" }).click()
  //validate appropriate message is shown
  await expect(page.getByText("Check email to reset password")).toBeVisible()
})

test("create existing account", async ({ page }) => {
  await page.goto("/login")
  await page.getByPlaceholder("you@example.com").click()
  await page.getByPlaceholder("you@example.com").fill("test@learntime.ai")
  await page.getByPlaceholder("you@example.com").press("Tab")
  await page.getByPlaceholder("••••••••").fill("1qasw23ed")
  await page.getByRole("button", { name: "Sign Up" }).click()
  await expect(page.getByText("User already registered")).toBeVisible()
})
