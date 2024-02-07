// Usage:
// bun ./scripts/ratelimit/reset.ts <model> <userId>
import { resetRateLimit } from "@/lib/server/ratelimiter"

async function main(model: string, userId: string) {
  const result = await resetRateLimit(model, userId)
  if (result) {
    console.log("Rate limit reset")
  } else {
    console.log("Rate limit not found")
  }
}

const model = process.argv.slice(2)[0]
const userId = process.argv.slice(2)[1]
if (!userId) {
  console.error("Usage: bun ./scripts/ratelimit/reset.ts <model> <userId>")
  process.exit(1)
}
await main(model, userId)
