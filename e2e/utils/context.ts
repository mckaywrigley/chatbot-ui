/** Reads what auth.setup captured. Kept separate so specs stay declarative. */
import fs from "node:fs"
import path from "node:path"

export interface QaContext {
  workspaceId: string
  locale: string
  capturedAt: string
}

export function qaContext(): QaContext {
  const file = path.join(process.cwd(), "e2e", ".auth", "context.json")
  if (!fs.existsSync(file)) {
    throw new Error(
      "[e2e] e2e/.auth/context.json missing - the `setup` project did not run or failed."
    )
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as QaContext
}
