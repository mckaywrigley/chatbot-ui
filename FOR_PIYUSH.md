# For Piyush: Open items I couldn't fully solve

These are the items from the latest review pass that I either can't act on locally (need assets / external accounts) or that are quality / behavior bugs in the agent pipelines that need your hands-on time. Everything else from the review is shipped - see the closing summary in the conversation.

---

## Blocked on assets

### 1. Logo + brand colors + font (issue #1)

**What's needed:** Drop the new logo image, the color-palette image, and the font name into the repo (or paste them inline in chat).

**Where it plugs in:**

- Logo: `components/icons/chatbotui-svg.tsx` (referenced by `ShadowAISVG` everywhere) and any PNG/SVG bundled under `public/`.
- Colors: Tailwind tokens live in `tailwind.config.ts` under `theme.extend.colors`. Brand keys today: `rust`, `brick`, `ink`, `teal-journey`, `sage-brand`, `orange-product`, `purple-persona`. I need the hex values to remap.
- Font: Currently `--font-sans` (Inter) and `--font-display` from `app/[locale]/layout.tsx`. Tell me which font you want and I'll wire it via `next/font/google` or `next/font/local`.

**Why I can't infer:** Your message said the assets are attached, but I don't see the attachments on my side. Paste the image, link to a Figma file, or upload to the repo.

---

## Agent quality issues - need you in the loop

These are problems with what the agents produce, not how the UI renders them. They need either prompt-engineering iteration with eval examples, or telemetry to see how the agents are actually behaving in production.

### 2. Literature search returning only ~4 papers despite a target of 10 (issue #13)

**Current state:** The literature scout already targets `minPapers = 10` in `app/api/design/draft/agents/index.ts:214`, and each per-source search caps at 15 results (`app/api/design/draft/utils/search-utils.ts:455`). I've also bumped "Generate more" to target 5 additional papers per run (`app/api/design/[designid]/generate/route.ts`).

**Why it's still 4 in practice:** The early-exit at 10 unique papers never fires because the multi-source dedup is collapsing results aggressively, or the upstream APIs are returning very few results. Likely causes:

- **Missing/invalid API keys.** Check `.env`:
  - `TAVILY_API_KEY` (powers the Tavily web search arm)
  - `SEMANTIC_SCHOLAR_API_KEY` (rate-limited without one)
  - `SERPAPI_API_KEY` / Google Scholar credentials
  - PubMed: free but rate-limited; check if you're being throttled
- **Query phrasing.** Open `app/api/design/draft/agents/index.ts:226-244` - the `buildRoundQuery` produces a verbose prompt that includes user context. PubMed and arXiv prefer short keyword queries; the long ones return zero hits.

**Action:**

- Run a real design in staging with `console.log` lines around line 257 in `agents/index.ts` and dump per-source counts.
- Fix the keys that are returning empty.
- If queries are the issue, tighten `paperFinderQuery` to a 4-7 keyword form for PubMed/arXiv and keep the verbose form for Tavily.

### 3. Hypothesis ranking puts the most-prevalent approach last (issue #22) - **CODE FIX SHIPPED, NEEDS YOUR VALIDATION**

**Symptom you described:** Most commonly used approach came out at the bottom of the hypothesis list.

**What I changed:**

- `app/api/design/draft/agents/generation.ts`: `dedupeAndRankHypotheses` now sorts by `relevance_score` only. Feasibility / novelty are still on the schema as optional+deprecated so old persisted runs still parse, but they no longer influence ranking.
- `app/api/design/draft/agents/prompts/generation.ts`: the JSON schema in the prompt now asks for `relevance_score` instead of `feasibility_score` / `novelty_score`, with a definition: "1 = most relevant / most strongly supported by the selected papers".

**What still needs you:** Run one fresh design generation and check whether the top-ranked hypothesis is now the well-supported / commonly-used one. If the model is ignoring relevance and falling back to novelty, the schema-level guardrail isn't enough and we need to bias the system prompt further.

### 4. Hypotheses + design ignore problem category (formulation vs engineering) (issue #24) - **CODE FIX SHIPPED, NEEDS YOUR VALIDATION**

**Symptom you described:** Formulation development domain + Optimization phase, problem about viscosity → first hypothesis came back about antibody engineering.

**What I changed:**

- `lib/design/prompt-schemas.ts`: literatureWorkflow now has an explicit step #3: "filter by the user's stated domain + phase. If Formulation development + Optimization, prioritise formulation papers and DOWN-RANK protein-engineering / sequence-modification papers even if they're highly cited."
- `app/api/design/draft/agents/prompts/generation.ts`: added a DOMAIN / PHASE GROUNDING section listing what kinds of interventions are valid for each domain (formulation → buffer/excipient/process; protein expression → host/media/purification; etc.) with explicit "Do NOT propose X" lines.

**What still needs you:** Re-run the antibody-viscosity case and confirm the first hypothesis is now formulation-flavoured. If it isn't, the model is overweighting literature signal over user category; we may need to add a filtering pass that drops engineering-keyword hypotheses before ranking.

### 5. Multi-paper / multi-variable mixing in hypotheses + design (issue #23) - **CODE FIX SHIPPED, NEEDS YOUR VALIDATION**

**What I changed:**

- `app/api/design/draft/agents/prompts/generation.ts`: the `provenance` field now requires "at least TWO distinct papers per hypothesis when papers are provided - synthesise across the literature, do not restate a single source." Added MULTI-VARIABLE COVERAGE section requiring 2+ factor variation where budget allows.
- `lib/design/prompt-schemas.ts` (experiment designer task list): step 4 now mandates two-factor variation; new step 5 requires synthesising findings from at least 2 distinct references.

**What still needs you:** Sanity-check on a real run that hypotheses do cite ≥2 papers and the design's conditions table actually crosses 2+ factors.

### 6. Design output empty / regenerated from hypothesis (issue #26)

**Symptom:** After the design generation finished, no design was shown - the UI fell back to re-deriving from the hypothesis text.

**Likely cause:** SSE stream events fired `done` but the `designs` field in the patch ended up empty due to a parser error or schema mismatch. Pipeline returned successfully but no design payload made it into Firestore.

**Action:**

- Add `console.error` logs in `app/api/design/[designid]/generate/route.ts` around the `design` case where `patch.designs` is assigned. Repro a generation and see whether the agent output is parsed correctly.
- Check `app/api/design/draft/supervisor.ts` and `agents/index.ts` for the design-phase aggregation. The hypothesis-keyed map → `GeneratedDesign[]` conversion in route.ts looks fragile.
- Likely a 1-2 hour debugging session with one real generation.

### 7. Sample-prep section lacks exact volumes (issue #29) - **CODE FIX SHIPPED, NEEDS YOUR VALIDATION**

**Current state when reported:** Output said "calculate the required amounts and add accordingly" instead of computing them.

**What I changed:**

- `lib/design/prompt-schemas.ts` (`procedureExecutionIntelligence`): added a SAMPLE PREPARATION VOLUMES ARE MANDATORY block. Every sample-prep step must include the exact volume in µL or mL (with worked example "48 µL of 5× formulation buffer", "10 µL of 10 mg/mL protein stock"). Explicit ban on "calculate as needed" / "add as needed" / "follow standard SOP". Tells the Procedure agent to pull volumes from the Planner's `workingSolutions` array (it already has stockVolumeUl / diluentVolumeUl / finalVolumeUl per condition) or compute them itself if the Planner output is incomplete.

**What still needs you:** Generate one design end-to-end and confirm sample-prep steps now have hard numbers. If the model still hedges, raise temperature on the Procedure agent or add a post-generation validator that rejects any sample-prep step missing a volume field.

---

## Out-of-scope for code, but for completeness

### 8. Native "Save to Google Drive" share option (issue #30 follow-up)

I wired the share popover to (a) open a `mailto:` draft with title + snippet, (b) open Google Drive's My Drive in a new tab, (c) copy the page link. A native one-click "Save to Drive" needs:

- A Google Cloud OAuth client ID (`GOOGLE_DRIVE_CLIENT_ID`)
- The Google Picker / Drive Upload JS SDK loaded on the page
- A second OAuth scope (`drive.file`) added to the existing Google sign-in flow

If you want one-click upload, set up the GCP project and pass me the client ID + scope and I'll wire the picker.

---

## Items I shipped this round (no action needed)

For your records - these are done in code:

| #   | What                                                                                                                          | Status                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 4   | Date format `Created mm/dd/yy · Modified mm/dd/yy` on all list slabs                                                          | done                       |
| 5   | "DESIGN" chip removed from design list rows; project/status/stage chips kept                                                  | done                       |
| 6   | New-design dialog subtitle changed to "Add your design title here."                                                           | done                       |
| 7   | Em-dashes (-) replaced with hyphens throughout app/components/lib                                                             | done                       |
| 8   | Attachments field removed from new-design dialog (kept for check-stats / make-plan)                                           | done                       |
| 9   | Problem page: added optional "Success criteria" text field                                                                    | done                       |
| 10  | Design header: full problem statement expanded during agent runs                                                              | done                       |
| 11  | Design view: side chat rail removed; single "Chat" button opens full-screen                                                   | done                       |
| 12  | Item 12 was "make list for Piyush" - this file                                                                                | done                       |
| 13  | `minPapers = 10` already in place, `Generate more` now targets 5 (caveat: see #2 above)                                       | done                       |
| 14  | Sort dropdown on papers list: "Rank by relevance" / "Sort by latest published"                                                | done                       |
| 15  | Paper card reformatted: Paper / Authors / Year / Summary / Source / Link labeled                                              | done                       |
| 17  | Download button on each paper                                                                                                 | done (was already present) |
| 18  | Paper link opens in new tab via `target="_blank"`                                                                             | done (was already present) |
| 19  | "Generate more" now targets 5 additional unique papers                                                                        | done                       |
| 21  | Feasibility / Novelty score blocks removed from hypothesis display (note: ranking logic still uses them - see #3 above)       | done                       |
| 25  | Hypothesis slab shown above the design-generation progress view                                                               | done                       |
| 27  | Hypothesis card splits short auto-title from full statement                                                                   | done                       |
| 28  | Problem page: added "Include replicates" Yes/No dropdown                                                                      | done                       |
| 30  | Share popover: email / drive / copy-link (replaced reddit / researchgate)                                                     | done                       |
| 31  | Design "Completed" status now derived from `content.approvedPhases.includes("design")` instead of the broken 14-day heuristic | done                       |

---

## How to use this file

1. Work through items 2-7 above when you have a debugging session free. Each one has a concrete file path and a starting point.
2. Once you've got the brand assets (item 1), paste them in chat and I'll wire them up in one pass.
3. Add a GCP OAuth client ID if you want native Drive upload (item 8).
4. Delete sections of this file as you close them; or replace with a `## Resolved` log if you'd rather keep history.
