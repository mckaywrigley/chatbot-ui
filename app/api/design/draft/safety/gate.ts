import { readFileSync } from "fs"
import { join } from "path"

// Load policy JSON
const policyPath = join(
  process.cwd(),
  "app",
  "api",
  "design",
  "draft",
  "safety",
  "policy.json"
)
const policy = JSON.parse(readFileSync(policyPath, "utf-8"))

export interface SafetyDecision {
  decision: "allow" | "flag" | "block"
  reasons: string[]
  matchedRules?: Array<{
    category: string
    severity: string
    matchedKeywords: string[]
  }>
}

/**
 * SafetyGate evaluates text against safety policy
 */
export function evaluate(text: string): SafetyDecision {
  const lowerText = text.toLowerCase()
  const matchedRules: Array<{
    category: string
    severity: string
    matchedKeywords: string[]
  }> = []
  const reasons: string[] = []

  // Check each rule
  for (const rule of policy.rules) {
    const matchedKeywords: string[] = []
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword)
      }
    }

    if (matchedKeywords.length > 0) {
      matchedRules.push({
        category: rule.category,
        severity: rule.severity,
        matchedKeywords
      })

      if (rule.severity === "block") {
        reasons.push(
          `Blocked: ${rule.description} (matched: ${matchedKeywords.join(", ")})`
        )
      } else if (rule.severity === "flag") {
        reasons.push(
          `Flagged: ${rule.description} (matched: ${matchedKeywords.join(", ")})`
        )
      }
    }
  }

  // Determine decision
  const hasBlock = matchedRules.some(r => r.severity === "block")
  const hasFlag = matchedRules.some(r => r.severity === "flag")

  if (hasBlock) {
    return {
      decision: "block",
      reasons,
      matchedRules
    }
  }

  if (hasFlag) {
    return {
      decision: "flag",
      reasons,
      matchedRules
    }
  }

  return {
    decision: "allow",
    reasons: []
  }
}

/**
 * Check if a research plan passes safety gate
 */
export function checkPlan(plan: {
  title: string
  description: string
  constraints?: Record<string, any>
}): SafetyDecision {
  const combinedText = `${plan.title} ${plan.description} ${JSON.stringify(plan.constraints || {})}`
  return evaluate(combinedText)
}

/**
 * Check if a hypothesis passes safety gate
 */
export function checkHypothesis(hypothesis: {
  content: string
  explanation?: string
}): SafetyDecision {
  const combinedText = `${hypothesis.content} ${hypothesis.explanation || ""}`
  return evaluate(combinedText)
}
