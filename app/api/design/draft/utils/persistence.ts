import { promises as fs } from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { Database } from "@/supabase/types"
import {
  ResearchPlan,
  Hypothesis,
  TournamentMatch,
  LogEntry
} from "../types/interfaces"

const DATA_DIR = (() => {
  // Vercel and other serverless providers mount the application directory as read-only.
  // Fall back to /tmp (or platform-provided temp dir) when running in those environments.
  const tempRoot =
    process.env.TMPDIR || process.env.TEMP || process.env.TMP || "/tmp"

  const baseDir =
    process.env.VERCEL || process.env.NODE_ENV === "production"
      ? tempRoot
      : path.join(process.cwd(), "app", "api", "design", "draft")

  return path.join(baseDir, "data")
})()

const useSupabasePersistence =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const supabaseAdmin = useSupabasePersistence
  ? createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  : null

type DesignPlanRow =
  Database["public"]["Tables"]["design_research_plans"]["Row"]
type DesignHypothesisRow =
  Database["public"]["Tables"]["design_hypotheses"]["Row"]
type DesignTournamentMatchRow =
  Database["public"]["Tables"]["design_tournament_matches"]["Row"]
type DesignLogRow = Database["public"]["Tables"]["design_logs"]["Row"]

const planRowFromPlan = (plan: ResearchPlan): DesignPlanRow => ({
  plan_id: plan.planId,
  title: plan.title,
  description: plan.description,
  status: plan.status || "pending",
  constraints: plan.constraints ?? {},
  preferences: plan.preferences ?? {},
  metadata: plan as any,
  created_at: plan.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString()
})

const planFromRow = (row: DesignPlanRow): ResearchPlan => {
  const metadata =
    ((row.metadata ?? {}) as unknown as Partial<ResearchPlan>) ?? {}
  return {
    ...metadata,
    planId: row.plan_id,
    userId: metadata.userId ?? "",
    title: row.title,
    description: row.description,
    status:
      (metadata.status as ResearchPlan["status"]) ||
      (row.status as ResearchPlan["status"]),
    constraints:
      (row.constraints as ResearchPlan["constraints"]) ??
      metadata.constraints ??
      {},
    preferences:
      (row.preferences as ResearchPlan["preferences"]) ??
      metadata.preferences ??
      {},
    createdAt: metadata.createdAt || row.created_at
  }
}

const hypothesisRowFromHypothesis = (
  hypothesis: Hypothesis
): DesignHypothesisRow => ({
  hypothesis_id: hypothesis.hypothesisId,
  plan_id: hypothesis.planId,
  content: hypothesis.content,
  explanation: hypothesis.explanation ?? null,
  elo: typeof hypothesis.elo === "number" ? hypothesis.elo : null,
  provenance: hypothesis.provenance ?? [],
  metadata: hypothesis as any,
  created_at: hypothesis.createdAt || new Date().toISOString()
})

const hypothesisFromRow = (row: DesignHypothesisRow): Hypothesis => {
  const metadata =
    ((row.metadata ?? {}) as unknown as Partial<Hypothesis>) ?? {}
  return {
    hypothesisId: row.hypothesis_id,
    planId: row.plan_id,
    content: row.content,
    explanation: row.explanation ?? metadata.explanation,
    elo: row.elo ?? metadata.elo,
    provenance:
      (row.provenance as Hypothesis["provenance"]) ?? metadata.provenance,
    createdAt: metadata.createdAt || row.created_at,
    ...metadata
  }
}

const matchRowFromMatch = (
  match: TournamentMatch
): DesignTournamentMatchRow => ({
  match_id: match.matchId,
  plan_id: match.planId,
  challenger_hypothesis_id: match.hypothesisA ?? null,
  defender_hypothesis_id: match.hypothesisB ?? null,
  winner_hypothesis_id: match.winner ?? null,
  metadata: match as any,
  created_at: match.createdAt || new Date().toISOString()
})

const matchFromRow = (row: DesignTournamentMatchRow): TournamentMatch => {
  const metadata =
    ((row.metadata ?? {}) as unknown as Partial<TournamentMatch>) ?? {}
  const hypothesisA = row.challenger_hypothesis_id ?? metadata.hypothesisA ?? ""
  const hypothesisB = row.defender_hypothesis_id ?? metadata.hypothesisB ?? ""
  const winner = row.winner_hypothesis_id ?? metadata.winner
  return {
    matchId: row.match_id,
    planId: row.plan_id,
    hypothesisA,
    hypothesisB,
    winner,
    createdAt: metadata.createdAt || row.created_at,
    ...metadata
  }
}

const logRowFromEntry = (entry: LogEntry): Omit<DesignLogRow, "id"> => ({
  plan_id: entry.context?.planId || "",
  timestamp: entry.timestamp,
  actor: entry.actor,
  level: entry.level,
  message: entry.message,
  context: entry.context ?? {}
})

// Ensure data directory exists (local fallback)
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Append an object to a JSON array file
 */
export async function appendToJsonFile<T>(
  filename: string,
  data: T
): Promise<void> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  let existing: T[] = []

  try {
    const content = await fs.readFile(filePath, "utf-8")
    existing = JSON.parse(content)
    if (!Array.isArray(existing)) {
      existing = []
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.warn(`[PERSISTENCE] Error reading ${filename}:`, error.message)
    }
    existing = []
  }

  existing.push(data)
  await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf-8")
}

/**
 * Read a JSON array file
 */
export async function readJsonFile<T>(filename: string): Promise<T[]> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)

  try {
    const content = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : []
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return []
    }
    console.warn(`[PERSISTENCE] Error reading ${filename}:`, error.message)
    return []
  }
}

/**
 * Write a JSON array file (overwrites)
 */
export async function writeJsonFile<T>(
  filename: string,
  data: T[]
): Promise<void> {
  await ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

/**
 * Update a specific item in a JSON array file by ID
 */
export async function updateJsonFileItem<T extends { [key: string]: any }>(
  filename: string,
  idField: string,
  idValue: string,
  updates: Partial<T>
): Promise<boolean> {
  const items = await readJsonFile<T>(filename)
  const index = items.findIndex(item => item[idField] === idValue)

  if (index === -1) {
    return false
  }

  items[index] = { ...items[index], ...updates }
  await writeJsonFile(filename, items)
  return true
}

/**
 * Find items in a JSON array file by filter
 */
export async function findJsonFileItems<T>(
  filename: string,
  filter: (item: T) => boolean
): Promise<T[]> {
  const items = await readJsonFile<T>(filename)
  return items.filter(filter)
}

// Convenience functions for specific data types
export async function saveResearchPlan(plan: ResearchPlan): Promise<void> {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from("design_research_plans")
      .upsert(planRowFromPlan(plan))
    if (!error) {
      return
    }
    console.warn(
      "[PERSISTENCE] Supabase saveResearchPlan failed:",
      error.message
    )
  }
  await ensureDataDir()
  const filename = "research_plans.json"
  const filePath = path.join(DATA_DIR, filename)

  let plans: ResearchPlan[] = []
  try {
    const content = await fs.readFile(filePath, "utf-8")
    const parsed = JSON.parse(content)
    plans = Array.isArray(parsed) ? parsed : []
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.warn(`[PERSISTENCE] Error reading ${filename}:`, error.message)
    }
    plans = []
  }

  const existingIndex = plans.findIndex(p => p.planId === plan.planId)

  if (existingIndex >= 0) {
    plans[existingIndex] = {
      ...plans[existingIndex],
      ...plan
    }
  } else {
    plans.push(plan)
  }

  await fs.writeFile(filePath, JSON.stringify(plans, null, 2), "utf-8")
}

export async function getResearchPlan(
  planId: string
): Promise<ResearchPlan | null> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("design_research_plans")
      .select("*")
      .eq("plan_id", planId)
      .maybeSingle()
    if (!error) {
      return data ? planFromRow(data) : null
    }
    console.warn(
      "[PERSISTENCE] Supabase getResearchPlan failed:",
      error.message
    )
  }
  const plans = await readJsonFile<ResearchPlan>("research_plans.json")
  for (let i = plans.length - 1; i >= 0; i--) {
    if (plans[i].planId === planId) {
      return plans[i]
    }
  }
  return null
}

export async function saveHypothesis(hypothesis: Hypothesis): Promise<void> {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from("design_hypotheses")
      .upsert(hypothesisRowFromHypothesis(hypothesis))
    if (!error) {
      return
    }
    console.warn("[PERSISTENCE] Supabase saveHypothesis failed:", error.message)
  }
  await appendToJsonFile<Hypothesis>("hypotheses.json", hypothesis)
}

export async function getHypothesesByPlanId(
  planId: string
): Promise<Hypothesis[]> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("design_hypotheses")
      .select("*")
      .eq("plan_id", planId)
    if (!error) {
      return (data ?? []).map(hypothesisFromRow)
    }
    console.warn(
      "[PERSISTENCE] Supabase getHypothesesByPlanId failed:",
      error.message
    )
  }
  return findJsonFileItems<Hypothesis>(
    "hypotheses.json",
    h => h.planId === planId
  )
}

export async function getHypothesisById(
  hypothesisId: string
): Promise<Hypothesis | null> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("design_hypotheses")
      .select("*")
      .eq("hypothesis_id", hypothesisId)
      .maybeSingle()
    if (!error) {
      return data ? hypothesisFromRow(data) : null
    }
    console.warn(
      "[PERSISTENCE] Supabase getHypothesisById failed:",
      error.message
    )
  }
  const hypotheses = await readJsonFile<Hypothesis>("hypotheses.json")
  for (let i = hypotheses.length - 1; i >= 0; i--) {
    if (hypotheses[i].hypothesisId === hypothesisId) {
      return hypotheses[i]
    }
  }
  return null
}

export async function updateHypothesis(
  hypothesisId: string,
  updates: Partial<Hypothesis>
): Promise<boolean> {
  if (supabaseAdmin) {
    const current = await getHypothesisById(hypothesisId)
    if (!current) {
      return false
    }
    const nextHypothesis = { ...current, ...updates }
    const { error } = await supabaseAdmin
      .from("design_hypotheses")
      .upsert(hypothesisRowFromHypothesis(nextHypothesis))
    if (!error) {
      return true
    }
    console.warn(
      "[PERSISTENCE] Supabase updateHypothesis failed:",
      error.message
    )
  }
  return updateJsonFileItem<Hypothesis>(
    "hypotheses.json",
    "hypothesisId",
    hypothesisId,
    updates
  )
}

export async function saveTournamentMatch(
  match: TournamentMatch
): Promise<void> {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from("design_tournament_matches")
      .upsert(matchRowFromMatch(match))
    if (!error) {
      return
    }
    console.warn(
      "[PERSISTENCE] Supabase saveTournamentMatch failed:",
      error.message
    )
  }
  await appendToJsonFile<TournamentMatch>("tournament_matches.json", match)
}

export async function getTournamentMatchesByPlanId(
  planId: string
): Promise<TournamentMatch[]> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("design_tournament_matches")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true })
    if (!error) {
      return (data ?? []).map(matchFromRow)
    }
    console.warn(
      "[PERSISTENCE] Supabase getTournamentMatchesByPlanId failed:",
      error.message
    )
  }
  return findJsonFileItems<TournamentMatch>(
    "tournament_matches.json",
    m => m.planId === planId
  )
}

export async function saveLog(entry: LogEntry): Promise<void> {
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from("design_logs")
      .insert(logRowFromEntry(entry))
    if (!error) {
      return
    }
    console.warn("[PERSISTENCE] Supabase saveLog failed:", error.message)
  }
  await appendToJsonFile<LogEntry>("logs.json", entry)
}

export async function getLogsByPlanId(
  planId: string,
  limit: number = 20
): Promise<LogEntry[]> {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("design_logs")
      .select("*")
      .eq("plan_id", planId)
      .order("timestamp", { ascending: false })
      .limit(limit)
    if (!error) {
      return (
        data?.map(row => {
          const level =
            row.level === "info" ||
            row.level === "warn" ||
            row.level === "error" ||
            row.level === "debug"
              ? row.level
              : "info"
          return {
            timestamp: row.timestamp,
            actor: row.actor,
            level,
            message: row.message,
            context: (row.context as LogEntry["context"]) ?? {
              planId: row.plan_id
            }
          }
        }) ?? []
      )
    }
    console.warn(
      "[PERSISTENCE] Supabase getLogsByPlanId failed:",
      error.message
    )
  }
  const allLogs = await readJsonFile<LogEntry>("logs.json")
  const planLogs = allLogs
    .filter(log => log.context?.planId === planId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit)
  return planLogs
}
