import { Inngest } from "inngest"

/**
 * Inngest client configuration
 *
 * By default we prefer sending events to **Inngest Cloud** when an
 * `INNGEST_EVENT_KEY` is configured (even in local development).
 *
 * To force using the **local Inngest dev server** (default: localhost:8288),
 * set `INNGEST_USE_DEV_SERVER=true`.
 */
const useDevServer =
  process.env.NODE_ENV !== "production" &&
  process.env.INNGEST_USE_DEV_SERVER === "true"

export const inngest = new Inngest({
  id: "chatbot-ui",
  name: "Chatbot UI",
  eventKey: process.env.INNGEST_EVENT_KEY,
  ...(useDevServer && {
    eventKey: undefined,
    isDev: true
  })
})
