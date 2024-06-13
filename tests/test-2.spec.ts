// import { test, expect } from "@playwright/test"

// test("test", async ({ page }) => {
//   await page.goto("http://localhost:3000/")
//   await page.getByRole("link", { name: "Start Learning" }).click()
//   await page.getByPlaceholder("you@example.com").click()
//   await page.getByPlaceholder("you@example.com").click()
//   await page.getByPlaceholder("you@example.com").fill("gerosullivan@gmail.com")
//   await page.getByRole("button", { name: "Login" }).click()
//   getByText("Invalid login credentials")
// })

// const { test, expect } = require("@playwright/test")

// test("unsuccessful login attempt", async ({ page }) => {
//   // Navigate to the login page
//   await page.goto("https://example.com/login")

//   // Enter username
//   await page.fill("#username", "invalid_user") // Replace with the actual selector for the username field

//   // Enter password
//   await page.fill("#password", "invalid_password") // Replace with the actual selector for the password field

//   // Click on the login button
//   await page.click("#login-button") // Replace with the actual selector for the login button

//   // Wait for error message to appear
//   await page.waitForSelector("#error-message") // Replace with the actual selector for the error message

//   // Verify the error message
//   const errorMessage = await page.textContent("#error-message") // Replace with the actual selector for the error message
//   expect(errorMessage).toContain("Invalid username or password") // Replace with the actual error message text
// })
