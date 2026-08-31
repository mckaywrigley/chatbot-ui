import { serve } from "inngest/next"
import { inngest } from "@/lib/inngest/client"
import { processDesignDraft, processDesignPhase } from "@/lib/inngest/functions"
import {
  ragBackfillWorkspace,
  ragCronSweep,
  ragDocChanged
} from "@/lib/inngest/functions/rag"

// Inngest verifies the request signature when a signing key is configured.
// In production we require it to be set so unauthenticated callers can't
// trigger background functions. In dev we warn loudly but still allow the
// local dev server (which uses its own unsigned protocol) to work.
if (!process.env.INNGEST_SIGNING_KEY) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "INNGEST_SIGNING_KEY is required in production to verify incoming Inngest webhooks"
    )
  } else {
    console.warn(
      "[inngest] INNGEST_SIGNING_KEY not set - signature verification disabled (dev only)"
    )
  }
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processDesignDraft,
    processDesignPhase,
    ragDocChanged,
    ragCronSweep,
    ragBackfillWorkspace
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY
})
