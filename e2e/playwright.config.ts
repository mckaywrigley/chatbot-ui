import { defineConfig, devices } from "@playwright/test"

/**
 * Nightly production health check.
 *
 * This suite answers one question: is ShadowAI working right now, end to end,
 * for a real user? It runs against a deployed environment (production by
 * default) rather than a local dev server, because a health check that passes
 * on localhost while production is down is worse than no health check.
 *
 * Three projects, run in order:
 *   setup    - signs in once and saves the session for everything downstream.
 *   public   - login/signup pages, no session needed. Runs even when the QA
 *              credentials are broken, which is when you most want the signal.
 *   smoke    - workspace and design creation. Fast, cheap, retried.
 *   pipeline - the real AI chain: literature -> hypotheses -> design -> report.
 *              Slow and expensive, so it is NEVER retried: a retry would burn
 *              another full run of Azure + PaperFinder spend to tell us
 *              something the first failure already told us.
 */
const BASE_URL = process.env.E2E_BASE_URL || "https://app.shadowai.work"

export default defineConfig({
  testDir: "./specs",
  // Everything here talks to ONE shared account and one workspace, so parallel
  // execution would have tests deleting each other's designs.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Generous global cap; the pipeline project raises its own further.
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ["list"],
    ["html", { outputFolder: "../playwright-report", open: "never" }],
    ["json", { outputFile: "../e2e-results.json" }]
  ],

  use: {
    baseURL: BASE_URL,
    // A failed nightly run is often the only artefact anyone looks at, so
    // capture enough to diagnose it without reproducing.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      // Lets us filter synthetic traffic out of analytics and rate limiting.
      "x-shadowai-qa": "nightly"
    }
  },

  projects: [
    {
      name: "setup",
      testDir: ".",
      testMatch: /auth\.setup\.ts/
    },
    {
      // Deliberately does NOT depend on `setup`. These checks need no session,
      // and making them wait on sign-in would mean an expired QA password
      // hides whether the login and signup pages render at all - which is
      // precisely what you'd want to know in that situation.
      name: "public",
      retries: process.env.CI ? 1 : 0,
      testMatch: /specs\/auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "smoke",
      dependencies: ["setup"],
      retries: process.env.CI ? 1 : 0,
      testMatch: /specs\/workspace\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "pipeline",
      dependencies: ["setup"],
      retries: 0,
      // Literature + hypotheses + 4-section design + report, serially.
      timeout: 45 * 60_000,
      testMatch: /specs\/pipeline\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json"
      }
    }
  ]
})
