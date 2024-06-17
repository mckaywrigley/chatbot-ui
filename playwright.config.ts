import { defineConfig, devices } from "@playwright/test"

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(__dirname, ".env.local") })

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry"
  },

  /* Configure projects for major browsers */
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use prepared auth state.
        storageState: "playwright/.auth/user.json"
      },
      dependencies: ["setup"]
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    },
    {
      name: "login",
      testMatch: /.*login.spec.ts/,
      retries: 1
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run chat",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI
  }
  // globalTeardown: require.resolve("./tests/teardown.ts")
})
