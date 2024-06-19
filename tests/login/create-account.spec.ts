import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } })

async function teardownNewAccount() {
  console.log("Deleting test sign up user test_sign_up@learntime.ai.")

  // Fetch the user ID from the profiles table
  const { data, error: userError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("display_name", "ffsd")
    .single()

  if (userError) {
    console.error("Error fetching user:", userError)
    return
  }

  console.log(data)

  // Delete the user from the authentication users
  try {
    await supabase.auth.admin.deleteUser(data.user_id)
    console.log("User deleted from auth system successfully.")
  } catch (authError) {
    console.error("Error deleting user from auth:", authError)
    return
  }

  // Delete the user's profile
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", data.user_id)

  if (profileError) {
    console.error("Error deleting user profile:", profileError)
  } else {
    console.log("User profile deleted successfully.")
  }
}

test("create account", async ({ page }) => {
  // await teardownNewAccount() // cant delete user for some reason. chore to fix.

  const tempEmail = `test_${uuidv4()}@learntime.ai`

  await page.goto("/login")
  await page.getByPlaceholder("you@example.com").click()
  await page.getByPlaceholder("you@example.com").fill(tempEmail)
  await page.getByPlaceholder("you@example.com").press("Tab")
  await page.getByPlaceholder("••••••••").fill("1qasw23ed")
  await page.getByRole("button", { name: "Sign Up" }).click()
  await expect(page.getByText("Welcome to Learntime")).toBeVisible()
  await page.getByPlaceholder("Your Name").click()
  await page.getByPlaceholder("Your Name").fill("Test SignUp")
  await page.getByRole("button", { name: "Next" }).click()
  await expect(page.getByText("Setup Complete")).toBeVisible()
  await page.getByRole("button", { name: "Next" }).click()
})
