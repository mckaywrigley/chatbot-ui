# ShadowAI Co-Scientist: Experiment Design Process

## Overview

The design process is a **modular, phase-gated AI pipeline** that transforms a research problem into a fully formed experiment design. It moves through sequential phases, each handled by a specialized AI agent. Critically, **the user reviews and explicitly approves each phase before the next one begins**. No phase runs without the scientist's sign-off.

Each phase's output feeds directly into the next phase's input, creating a chain of provenance from research problem to final experiment protocol. The user can regenerate any phase if unsatisfied, and can revise previously approved phases (which automatically clears all downstream work to maintain consistency).

The system is designed for biopharma research, with domain-specific prompting for scientific rigor, lab testability, and regulatory awareness.

### User Control Model

| Action | What happens |
|--------|-------------|
| **Approve & Continue** | Locks the current phase, passes its output to the next phase, and triggers the next generation |
| **Regenerate** | Re-runs the current phase with fresh AI output; clears all downstream phases |
| **Revise** | Reopens a previously approved phase for editing; clears all downstream phases |

Phases that haven't been unlocked yet are locked and inaccessible in the UI. The scientist always controls the pace and direction of the pipeline.

---

## Interactive Design Flow (User-Facing)

This is the step-by-step flow the scientist experiences. Each step requires explicit approval before the next begins.

```
[Step 1] PROBLEM DEFINITION
        |  User fills: title, problem statement, goal, variables, constraints
        |  User clicks: "Approve & Start Literature Search"
        v
[Step 2] LITERATURE SEARCH (AI generates)
        |  Agent searches 5 databases, returns papers
        |  User reviews papers, selects relevant ones, can upload PDFs
        |  User clicks: "Approve & Generate Hypotheses"
        v
[Step 3] HYPOTHESIS GENERATION (AI generates)
        |  Agent produces candidate hypotheses grounded in literature
        |  User reviews hypotheses, selects the best ones
        |  User clicks: "Approve & Generate Design"
        v
[Step 4] EXPERIMENT DESIGN (AI generates)
        |  Agent creates full experiment protocols per selected hypothesis
        |  User reviews designs (setup, procedure, analysis, controls)
        |  User clicks: "Approve & Continue to Simulation"
        v
[Step 5] SIMULATION (AI generates per design)
        |  User triggers Monte Carlo simulation per design
        |  User reviews simulation results and metrics
        |  User clicks: "Finalize Design"
        v
[OVERVIEW] Final summary with all approved phases
```

At every step, the user can also click **"Regenerate"** to re-run the current phase, or **"Revise"** on any previously approved step to go back and change it (which clears all downstream work).

---

## Background Agent Pipeline (Advanced)

Behind the scenes, there is also a deeper background pipeline that generates and ranks hypotheses at scale:

```
[Phase 1] Literature Scout Agent
        |  Searches 5 scientific databases
        |  Synthesizes: what's been done, best methods, pitfalls
        v
[Phase 2] Hypothesis Generation Agent (5 agents x 4 hypotheses each)
        |  Generates 20 independent hypotheses grounded in literature
        |  Each scored for feasibility and novelty
        v
[Phase 3] Tournament Ranking Agent (pairwise)
        |  Every hypothesis compared head-to-head
        |  Elo rating system ranks them
        |  Top 5 surfaced to the user
        v
[Phase 4] Reflection Agent
        |  Top 5 hypotheses critiqued for strengths, weaknesses, risks
        v
[Phase 5] Evolution Agent
        |  Top 5 hypotheses refined into improved variants
        v
[Phase 6] Meta-Review Agent
        |  Cross-hypothesis patterns, gaps, and recommendations identified
        v
Top 5 ranked hypotheses available for experiment design
```

Each phase is described in detail below, including the exact instructions (prompts) given to the AI agent.

---

## Phase 1: Literature Scout

### Purpose

Search the scientific literature and produce a structured summary of the current state of research relevant to the user's problem.

### Inputs

| Field | Description |
|-------|-------------|
| Problem | The core research question (e.g., "Effect of polymer concentration on zero-shear viscosity") |
| Objectives | What the experiment aims to achieve |
| Variables | Independent and dependent variables under study |
| Special Considerations | Constraints like equipment limits, safety, regulatory requirements |

### Literature Sources Searched

The agent queries five databases in parallel and aggregates results:

| Source | Strength | Rate Limit |
|--------|----------|------------|
| **PubMed** | Gold standard for biomedical literature | 3 req/min |
| **arXiv** | Preprints, technical/computational methods | 3 req/min |
| **Semantic Scholar** | Cross-disciplinary, citation-aware | 2 req/min |
| **Google Scholar** | Broad academic coverage | 2 req/min |
| **Tavily** | Recent/real-time web results, emerging research | 5 req/min |

The search query is optimized for the biomedical domain, with automatic expansion using domain-specific terms (e.g., "clinical trial", "biomarker", "therapeutic", "efficacy", "safety").

### What the Agent Produces

| Output Field | Description |
|-------------|-------------|
| **What Others Have Done** | Summary of existing research approaches, key findings, and established methods |
| **Good Methods and Tools** | Recommended methodologies, instruments, and analytical techniques from the literature |
| **Potential Pitfalls** | Common failure modes, known limitations, and risks identified in prior work |
| **Citations** | Numbered reference list with paper titles, authors, journals, and DOIs |

### How Literature Feeds Downstream

The literature output is injected directly into the hypothesis generation prompt. Each hypothesis generator receives:
- The full "What Others Have Done" summary
- The "Good Methods and Tools" section
- The "Potential Pitfalls" section

This ensures hypotheses are grounded in existing science rather than generated in a vacuum.

---

## Phase 2: Hypothesis Generation

### Purpose

Generate multiple independent, testable scientific hypotheses for the research problem, each grounded in the literature findings.

### How It Works

The system runs **5 agents in parallel**, each producing **4 distinct hypotheses** (20 total). Each agent receives the same inputs but produces different hypotheses due to controlled randomness (temperature = 0.7) and an explicit instruction to explore different angles. This "generate broadly, then filter" strategy maximizes diversity - only the **top 5** survive ranking to be shown to the user.

### Agent Instructions (Prompt)

The AI agent receives the following instructions:

> **Role:** You are a Hypothesis Generation Agent specialized in creating testable scientific hypotheses for biopharma research.
>
> **Your task is to generate clear, specific, and testable hypotheses based on the research plan provided. Each hypothesis should:**
> - Be directly testable in a laboratory setting
> - Clearly define the relationship or effect being tested
> - Use correct scientific terminology
> - Be grounded in scientific principles
> - Leverage insights from the provided literature context
>
> **For each hypothesis, provide:**
> - **hypothesis** - the testable hypothesis statement
> - **explanation** - brief explanation of why this hypothesis is scientifically sound
> - **provenance** - for EACH source, include the citation index [N] and the paper title from the Literature Insights. Format each entry as: "[N] Paper Title - brief explanation of how this paper informed the hypothesis"
> - **feasibility_score** - 0 to 1 rating of how feasible this is to test in a lab
> - **novelty_score** - 0 to 1 rating of how novel this hypothesis is vs. existing work

### What the Agent Receives

The user prompt includes:

```
Research Plan:
  Title: [from user input]
  Description: [from user input]
  Constraints: [from user input]

Literature Insights:
  What Others Have Done: [from Phase 1]
  Good Methods & Tools: [from Phase 1]
  Potential Pitfalls: [from Phase 1]

Generate a testable hypothesis for this research plan.

IMPORTANT: In the "provenance" array, reference specific papers from the
Literature Insights using the format "[N] Paper Title - explanation".
```

### What Each Hypothesis Looks Like

| Field | Example |
|-------|---------|
| **Hypothesis** | "Increasing polymer concentration above c* will raise zero-shear viscosity following a 3.4-power scaling." |
| **Explanation** | "Derived from classical scaling laws in the selected literature; the exponent matches entanglement-dominated regimes." |
| **Provenance** | ["[1] Scaling laws for viscosity in concentrated polymer solutions - power-law regime transition at c* directly supports the 3.4 exponent prediction"] |
| **Feasibility Score** | 0.85 |
| **Novelty Score** | 0.45 |

### Safety Gating

Every generated hypothesis passes through a safety gate before being accepted:

- **Allow** - hypothesis is clean, proceeds to ranking
- **Flag** - hypothesis contains potentially sensitive terms but proceeds with a "needs review" marker (common in biopharma where terms like "synthesize" and "drug" trigger false positives)
- **Block** - hypothesis is discarded entirely (e.g., contains genuinely harmful content)

---

## Phase 3: Tournament Ranking

### Purpose

Rank all generated hypotheses against each other using pairwise comparison, producing an objective quality ordering.

### How It Works

Every pair of hypotheses is compared head-to-head. With 20 hypotheses, this creates 190 matchups (C(20,2)). Each matchup is an independent AI call. After ranking, only the **top 5** hypotheses by Elo rating advance to the next phases.

### Agent Instructions (Prompt)

> **Role:** You are a Ranking Agent that compares pairs of scientific hypotheses.
>
> **Your task is to determine which hypothesis is better based on:**
> - Scientific rigor and testability
> - Feasibility and practicality
> - Novelty and potential impact
> - Clarity and specificity
>
> **For each comparison, provide:**
> - **winner** - "A" or "B"
> - **reasoning** - explanation of why this hypothesis is better
> - **confidence** - 0 to 1
> - **criteria_scores** - per-criterion scores for both A and B:
>   - rigor (A vs B)
>   - feasibility (A vs B)
>   - novelty (A vs B)
>   - clarity (A vs B)

### What the Agent Receives

```
Compare these two hypotheses:

Hypothesis A: [hypothesis text]

Hypothesis B: [hypothesis text]

Determine which hypothesis is better and explain your reasoning.
```

### Elo Rating System

Each hypothesis starts with an Elo rating of **1500**. After each pairwise comparison:

- The winner gains Elo points
- The loser loses Elo points
- The magnitude of change depends on the "upset factor" (beating a higher-rated hypothesis yields more points)

After all 45 matches, hypotheses are sorted by final Elo rating. This produces a robust ranking that accounts for the full competitive landscape, not just individual scores.

---

## Phase 4: Reflection

### Purpose

Critically evaluate the top-ranked hypotheses to identify strengths, weaknesses, and areas for improvement before evolution.

### Agent Instructions (Prompt)

> **Role:** You are a Reflection Agent that critically evaluates scientific hypotheses.
>
> **Your task is to analyze a hypothesis and provide constructive reflection on:**
> - Strengths and weaknesses
> - Potential improvements
> - Risks or limitations
> - Alternative perspectives
>
> **For each hypothesis, provide:**
> - **strengths** - what makes this hypothesis strong
> - **weaknesses** - potential issues or gaps
> - **improvements** - specific suggestions for improvement
> - **risks** - potential risks or limitations
> - **alternatives** - alternative approaches to consider

### What the Agent Receives

```
Hypothesis to reflect on:
  Content: [hypothesis text]
  Explanation: [hypothesis explanation]

Provide a critical reflection on this hypothesis.
```

This phase runs on the **top 5 hypotheses** by Elo rating.

---

## Phase 5: Evolution

### Purpose

Generate improved variants of the top hypotheses by refining language, adjusting scope, and incorporating the reflection feedback.

### Agent Instructions (Prompt)

> **Role:** You are an Evolution Agent that creates variants and improvements of scientific hypotheses.
>
> **Your task is to generate evolved versions of a hypothesis by:**
> - Refining the language for clarity
> - Adjusting scope or focus
> - Incorporating improvements
> - Exploring alternative formulations
>
> **For each variant, provide:**
> - **hypothesis** - the evolved hypothesis statement
> - **explanation** - what changed and why
> - **improvement_type** - e.g., "clarity", "scope", "specificity"

### What the Agent Receives

```
Original hypothesis to evolve:
  Content: [hypothesis text]
  Explanation: [hypothesis explanation]

Generate 2-3 evolved variants of this hypothesis with improvements.
```

Each evolved variant is saved as a new hypothesis (tagged with its parent) and also passes through the safety gate. This expands the hypothesis pool with higher-quality candidates.

---

## Phase 6: Meta-Review

### Purpose

Step back and assess the overall research process - identify patterns across all hypotheses, find gaps in coverage, and suggest improvements for future iterations.

### Agent Instructions (Prompt)

> **Role:** You are a Meta Review Agent that analyzes the overall research process and generates prompt patches.
>
> **Your task is to:**
> - Review the research plan and generated hypotheses
> - Identify patterns, gaps, or opportunities
> - Suggest improvements to the research approach
> - Generate prompt patches for future iterations
>
> **Provide:**
> - **overall_assessment** - summary of the research quality
> - **patterns** - observed patterns across hypotheses
> - **gaps** - identified gaps or missing elements
> - **prompt_patches** - specific improvement suggestions for the generation process, each with type, suggestion, and rationale
> - **recommendations** - actionable next steps

### What the Agent Receives

```
Research Plan:
  Title: [title]
  Description: [description]

Top Generated Hypotheses:
  1. [hypothesis 1]
  2. [hypothesis 2]
  ...

Provide a meta-review and generate prompt patches for improvement.
```

---

## Downstream: Experiment Design Pipeline

Once the user selects a top-ranked hypothesis, it flows into a separate sequential agent pipeline that produces a full experiment protocol:

### Agent 1: Experiment Designer

Takes the selected hypothesis + literature context and produces:

| Section | Contents |
|---------|----------|
| **What Will Be Tested** | The specific relationship or effect under investigation |
| **What Will Be Measured** | Dependent variables, endpoints, readouts |
| **Control Groups** | Negative/positive controls, sham conditions |
| **Experimental Groups** | Treatment arms, dose levels, conditions |
| **Sample Types** | Cell lines, animal models, patient samples, materials |
| **Tools Needed** | Instruments, reagents, software |
| **Replicates and Conditions** | Number of replicates, environmental conditions |
| **Specific Requirements** | Regulatory, biosafety, or equipment constraints |

Plus a full **Execution Plan**:

| Section | Contents |
|---------|----------|
| **Materials List** | Complete bill of materials with quantities and sources |
| **Material Preparation** | Step-by-step prep instructions |
| **Step-by-Step Procedure** | Detailed experimental protocol |
| **Timeline** | Day-by-day or phase-by-phase schedule |
| **Setup Instructions** | Equipment calibration, environment prep |
| **Data Collection Plan** | What to record, when, and how |
| **Conditions Table** | Structured table of all experimental conditions |
| **Storage/Disposal** | Sample handling, waste management |
| **Safety Notes** | PPE, chemical handling, biosafety level |

### Agent 2: Statistical Reviewer

Reviews the experiment design and provides:

| Section | Contents |
|---------|----------|
| **What Looks Good** | Strengths of the design (power, controls, blinding) |
| **Problems or Risks** | Statistical weaknesses (underpowered, confounders, bias) |
| **Suggested Improvements** | Specific fixes (increase N, add controls, change analysis) |
| **Overall Assessment** | Summary judgment on design robustness |

### Agent 3: Report Writer

Synthesizes everything into a final cohesive report:

| Section | Contents |
|---------|----------|
| **Research Objective** | Refined problem statement |
| **Literature Summary** | Curated literature review with citations |
| **Hypothesis** | Selected hypothesis with rationale |
| **Experiment Design** | Full design + execution plan |
| **Statistical Review** | Reviewer's assessment and recommendations |
| **Final Notes** | Caveats, next steps, and considerations |

---

## Summary: What Makes This Process Different

| Aspect | Approach |
|--------|----------|
| **Literature grounding** | Every hypothesis is required to cite specific papers and explain how they informed the hypothesis |
| **Diversity by design** | 5 parallel agents each produce 4 distinct hypotheses (20 total); only the top 5 survive ranking |
| **Competitive ranking** | Elo tournament ranking is more robust than simple scoring - it captures relative quality across the full set |
| **Safety gating** | Every hypothesis and plan is screened before it enters the pipeline |
| **Iterative refinement** | Reflection + Evolution phases improve hypotheses before they reach experiment design |
| **Self-improving** | Meta-review generates "prompt patches" - suggestions for how to improve the generation process itself in future runs |
| **End-to-end traceability** | Every hypothesis carries provenance back to specific papers; every design decision is traceable to a hypothesis |

---

## Open Questions for Review

1. **Hypothesis count**: We generate 20 seed hypotheses and surface the top 5 after ranking. Is this ratio right for a typical biopharma experiment design?
2. **Ranking criteria weights**: The tournament weights rigor, feasibility, novelty, and clarity equally. Should any criterion be weighted higher for biopharma?
3. **Evolution scope**: Currently generates 2-3 variants per hypothesis. Is this sufficient, or should we allow more aggressive exploration?
4. **Safety gate sensitivity**: The current keyword-based safety gate produces false positives on common biopharma terms (e.g., "drug", "synthesize"). Should we use a domain-aware safety model instead?
5. **Literature sources**: Are PubMed, arXiv, Semantic Scholar, Google Scholar, and Tavily the right mix? Should we add domain-specific databases (e.g., ClinicalTrials.gov, ChEMBL, UniProt)?
6. **Feasibility vs. Novelty tradeoff**: The system scores both but doesn't currently let the user set a preference. Should we add a slider or preference setting?
7. **Human-in-the-loop granularity**: The interactive flow now gates every phase with user approval. Is the current granularity right (5 gates), or should some phases be combined or split further?
