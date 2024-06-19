import { test, expect } from "@playwright/test"
import submitWaitStopLLM from "./submitWaitStopLLM"

import { createClient } from "@supabase/supabase-js"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

test.beforeEach(async ({ page }) => {
  console.log("Resetting Test user to onboard tutorial.")
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "test@learntime.ai", //d0e1c3fb-7a58-4419-ba16-31904034d36a
    password: "1qasw23ed"
  })

  if (error) {
    console.error("Authentication error:", error)
    return
  }

  const profileId = data.user.id

  // Perform the database update
  const { data: responseData, error: updateError } = await supabase
    .from("profiles")
    .update({
      has_onboarded: false
    })
    .eq("user_id", profileId)
    .single()

  if (updateError) {
    console.error("Update error:", updateError)
  } else {
    console.log("Row updated successfully:", responseData)
  }
})

test("Onboard tutorial test", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Start Learning" }).click()

  await page.goto("/")
  await page.goto("/setup")
  await page.getByPlaceholder("Your Name").click()
  await page.getByPlaceholder("Your Name").fill("Test")
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page.getByRole("heading")).toContainText("Setup Complete")
  await expect(page.locator("body")).toContainText(
    "Welcome to Learntime, Test!"
  )
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page.locator("body")).toContainText("New topic", {
    timeout: 20000
  })
  await expect(page.getByRole("paragraph")).toContainText("tutorial")
  await expect(
    page.locator(".flex > div > .hover\\:bg-accent").first()
  ).toBeVisible()
  await page.getByRole("button", { name: "Next." }).click()
  await expect(
    page.locator("div:nth-child(4) > div:nth-child(4)")
  ).toBeVisible()
  await page.getByRole("button", { name: "States of matter." }).click()
  await expect(page.locator("div:nth-child(6)").first()).toBeVisible()
  await page.getByRole("button", { name: "View topic." }).click()
  await expect(page.getByRole("heading")).toContainText("States of Matter")
  await page.getByRole("button", { name: "Save tutorial study sheet." }).click()
  await expect(
    page.locator("div:nth-child(4) > div:nth-child(10)")
  ).toBeVisible()
  await page.getByPlaceholder("Message Mentor...").click()
  await page.getByPlaceholder("Message Mentor...").click()
  await page
    .getByPlaceholder("Message Mentor...")
    .fill(
      "solid, liquid and gas. solid melts to liquid. liquid evaporates to gas. liquid freezes to solid."
    )

  await submitWaitStopLLM(page)

  await expect(
    page.locator("div:nth-child(4) > div:nth-child(12)")
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Next step - reply to hints." })
    .click()
  await expect(
    page.locator("div:nth-child(4) > div:nth-child(14)")
  ).toBeVisible()
  await page.getByPlaceholder("Message Mentor...").click()
  await page.getByPlaceholder("Message Mentor...").fill("i don't know")

  await submitWaitStopLLM(page)

  await expect(
    page.locator("div:nth-child(4) > div:nth-child(16)")
  ).toBeVisible()
  await page.getByRole("button", { name: "Final stage - review." }).click()
  await expect(
    page.locator("div:nth-child(4) > div:nth-child(18)")
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Show topic content for final" })
    .click()
  await page.getByRole("button", { name: "Finish tutorial." }).click()
  await expect(
    page.locator("div:nth-child(4) > div:nth-child(22)")
  ).toBeVisible()
})
