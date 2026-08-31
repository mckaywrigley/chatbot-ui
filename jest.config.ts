import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./"
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  // Playwright specs live under __tests__/playwright-test and run via the
  // Playwright runner - exclude them so `jest` (the CI gate) doesn't try to
  // execute them (they fail under jest: no test/expect from @playwright/test).
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/__tests__/playwright-test/",
    // The nightly QA suite is Playwright, driven by its own config and runner.
    // Jest's default testMatch picks up any *.spec.ts, so without this it would
    // try to execute browser specs under jsdom and fail on the missing
    // @playwright/test globals.
    "<rootDir>/e2e/"
  ]
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
