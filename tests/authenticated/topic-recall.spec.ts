import { test, expect } from "@playwright/test"
import path from "path"

test("topic recall demo session", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Start Learning" }).click()

  await page.getByPlaceholder("Search topic names...").click()
  await page.getByPlaceholder("Search topic names...").fill("solar system")
  await expect(page.locator("body")).toContainText("The Solar System")

  await page
    .locator("div")
    .filter({ hasText: /^The Solar System$/ })
    .nth(2)
    .click()

  await expect(page.locator(".bg-secondary").first()).toContainText(
    "The Solar System"
  )
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
  // await page.getByPlaceholder("Message Mentor...").click()
  // await page
  //   .getByPlaceholder("Message Mentor...")
  //   .fill(
  //     "Inner Planets (Terrestrial planets): Mercury, Venus, Earth, and Mars. These are rocky and have relatively few moons.\nOuter Planets (Gas giants and ice giants): Jupiter and Saturn are gas giants, made mostly of hydrogen and helium. Uranus and Neptune are ice giants, with more ices such as water, ammonia, and methane."
  //   )
  // await page.locator(".absolute > .bg-primary").first().click()
  // await expect(page.locator("div:nth-child(6)").first()).toContainText(
  //   "Hints",
  //   { timeout: 40000 }
  // )
  // await page.getByPlaceholder("Message Mentor...").click()
  // await page.getByPlaceholder("Message Mentor...").fill("I don't know")
  // await page.locator(".absolute > .bg-primary").first().click()

  // await expect(
  //   page.getByRole("button", { name: "Show study sheet." })
  // ).toBeVisible()
})

test("new topic creation and edit with error handling", async ({ page }) => {
  await page.goto("/")

  // Start the learning process
  await page.getByRole("link", { name: "Start Learning" }).click()
  await page.getByRole("button", { name: "New topic" }).click()

  // Check if the new topic prompt is visible
  await expect(
    page
      .locator("div")
      .filter({ hasText: /^MentorEnter your topic name below to start\.$/ })
      .nth(1)
  ).toBeVisible()

  // Check for the instruction text
  await expect(page.getByRole("paragraph")).toContainText(
    "Enter your topic name below to start."
  )

  // Enter the topic name
  await page.getByPlaceholder("Message Mentor...").click()
  await page.getByPlaceholder("Message Mentor...").fill("electron")
  await page.locator(".absolute > .bg-primary").first().click()
  // Check if topic creation is successful
  await expect(
    page.locator("div:nth-child(4) > div:nth-child(4)")
  ).toBeVisible()
  await expect(page.locator("body")).toContainText(
    "Topic successfully created. Please describe your topic below. You can also upload files ⨁ as source material for me to generate your study notes."
  )

  // Enter the topic description
  await page.getByPlaceholder("Message Mentor...").click()
  await page.getByPlaceholder("Message Mentor...").fill("electron introduction")
  await page.locator(".absolute > .bg-primary").first().click()

  // Check if the description is visible and save study sheet button is available
  await expect(page.locator("div:nth-child(6)").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Save study sheet." })
  ).toBeVisible()
  await page.locator(".hover\\:bg-background > path").click()

  // Save the study sheet
  await page.getByRole("button", { name: "Save study sheet." }).click()

  // Check if the save was successful
  await expect(
    page
      .locator("div")
      .filter({ hasText: /^MentorSave successful\.$/ })
      .first()
  ).toBeVisible()

  // Edit the topic
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

  // Update the topic
  await page.getByPlaceholder("Message Mentor...").click()
  await page
    .getByPlaceholder("Message Mentor...")
    .fill("remove introduction at the begining")

  await page.locator(".absolute > .bg-primary").first().click()

  // Check if the update is processed
  await expect(page.locator("div:nth-child(12)")).toBeVisible()

  await page.locator(".ml-2 > svg:nth-child(2)").first().click()
  await expect(
    page.getByRole("heading", { name: "Delete electron" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Delete" }).click()
  await expect(page).toHaveURL(/.*\/chat/)
})

test("new topic creation with file upload RAG", async ({ page }) => {
  await page.goto("/")

  // Start the learning process
  await page.getByRole("link", { name: "Start Learning" }).click()
  await page.getByRole("button", { name: "New topic" }).click()

  await page.getByPlaceholder("Message Mentor...").click()
  await page.getByPlaceholder("Message Mentor...").fill("Anatomy of the heart")
  await page.locator(".absolute > .bg-primary").first().click()

  // Locate the hidden input field and set files
  const fileInput = await page.locator('input[type="file"]')
  await fileInput.setInputFiles(path.join(__dirname, "anatomy_heart.pdf"))
  await expect(
    page
      .locator("div")
      .filter({ hasText: /^anatomy_heart\.pdf$/ })
      .nth(2)
  ).toBeVisible()
  await page.getByPlaceholder("Message Mentor...").click()
  await page
    .getByPlaceholder("Message Mentor...")
    .fill("Use this file to generate study notes")
  await page.locator(".absolute > .bg-primary").first().click()

  await page.locator(".hover\\:bg-background > path").click()
  await expect(page.locator("div:nth-child(6)").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Save study sheet." })
  ).toBeVisible()

  await page.locator(".ml-2 > svg:nth-child(2)").first().click()
  await page.getByRole("button", { name: "Delete" }).click()
})
