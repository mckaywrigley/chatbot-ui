// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "none"
const sampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_SAMPLE_RATE || "1.0")

Sentry.init({
  dsn,
  environment,
  sampleRate,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false
})
