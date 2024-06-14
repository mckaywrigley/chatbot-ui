import { test, expect } from "@playwright/test"

test("topic recall demo session", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Start Learning" }).click()

  await page.locator(".hover\\:bg-accent").first().click()
  await expect(page.locator("body")).toContainText("The Solar System")
  await expect(page.getByRole("paragraph")).toContainText(
    'Welcome back to the topic "The Solar System". Please select from the options below.'
  )
  await expect(
    page.getByRole("button", { name: "Start recall now." })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Show study sheet." })
  ).toBeVisible()

  await page.getByRole("button", { name: "Show study sheet." }).click()
  await expect(page.locator("div:nth-child(4) > .relative")).toBeVisible()
  await expect(page.locator("body")).toContainText(
    "Basic overview of the Solar System"
  )
  await page.getByRole("button", { name: "Start recall now." }).click()
  await expect(
    page
      .locator("div")
      .filter({
        hasText: /^MentorTry to recall as much as you can\. Good luck!$/
      })
      .nth(1)
  ).toBeVisible()
  await expect(page.locator("body")).toContainText(
    "Try to recall as much as you can. Good luck!"
  )
})

test("new topic creation and edit", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Start Learning" }).click()
  await page.getByRole("button", { name: "New topic" }).click()
  await expect(
    page
      .locator("div")
      .filter({ hasText: /^MentorEnter your topic name below to start\.$/ })
      .nth(1)
  ).toBeVisible()
  await expect(page.getByRole("paragraph")).toContainText(
    "Enter your topic name below to start."
  )
  await page.getByPlaceholder("Message Mentor...").click()
  await page.getByPlaceholder("Message Mentor...").fill("electron")
  await expect(
    page.locator("div:nth-child(4) > div:nth-child(4)")
  ).toBeVisible()
  await expect(page.locator("body")).toContainText(
    "Topic successfully created. Please describe your topic below. You can also upload files ⨁ as source material for me to generate your study notes."
  )
  await page.getByPlaceholder("Message Mentor...").click()
  await page.getByPlaceholder("Message Mentor...").fill("electron introduction")
  await expect(page.locator("div:nth-child(6)").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Save study sheet." })
  ).toBeVisible()
  await page.getByRole("button", { name: "Save study sheet." }).click()
  await expect(
    page
      .locator("div")
      .filter({ hasText: /^MentorSave successful\.$/ })
      .first()
  ).toBeVisible()
  await page.getByRole("button", { name: "Edit topic." }).click()
  await expect(
    page
      .locator("div")
      .filter({
        hasText:
          /^MentorWhat updates should we make to the topic study sheet\?$/
      })
      .first()
  ).toBeVisible()
  await page.getByPlaceholder("Message Mentor...").click()
  await page
    .getByPlaceholder("Message Mentor...")
    .fill("remove introduction at the begining")
  await expect(page.locator("div:nth-child(12)")).toBeVisible()
})
