import { test, expect } from "@playwright/test"

import { createClient } from "@supabase/supabase-js"

const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabase_url!, service_role_key!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } })

async function teardownNewAccount() {
  console.log("Deleting test sign up user test_sign_up@learntime.ai.")

  // Fetch the user from the auth.users table
  const { data, error: userError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("display_name", "Test SignUp")
    .single()

  console.log(data)

  if (userError) {
    console.error("Error fetching user:", userError)
    return
  }

  // Delete the user from the authentication users
  const { error: authError } = await supabase.auth.admin.deleteUser(
    data.user_id
  )

  if (authError) {
    console.error("Error deleting user from auth:", authError)
    return
  }

  // Delete the user's profile (if not automatically handled)
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("email", "test_sign_up@learntime.ai")

  if (profileError) {
    console.error("Error deleting user profile:", profileError)
  } else {
    console.log("User deleted successfully")
  }
}

test("create account", async ({ page }) => {
  await teardownNewAccount()

  // await page.goto("/login")
  // await page.getByPlaceholder("you@example.com").click()
  // await page
  //   .getByPlaceholder("you@example.com")
  //   .fill("test_sign_up@learntime.ai")
  // await page.getByPlaceholder("you@example.com").press("Tab")
  // await page.getByPlaceholder("••••••••").fill("1qasw23ed")
  // await page.getByRole("button", { name: "Sign Up" }).click()
  // await expect(page.getByText("Welcome to Learntime")).toBeVisible()
  // await page.getByPlaceholder("Your Name").click()
  // await page.getByPlaceholder("Your Name").fill("Test SignUp")
  // await page.getByRole("button", { name: "Next" }).click()
  // await expect(page.getByText("Setup Complete")).toBeVisible()
  // await page.getByRole("button", { name: "Next" }).click()
})
