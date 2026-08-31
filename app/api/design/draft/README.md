# ShadowAI Co-Scientist Implementation

This directory contains the asynchronous Google ADK-style co-scientist pipeline implementation for research plan generation and hypothesis evaluation.

## Architecture

The system follows a Supervisor → Worker Pool → Agent Adapters architecture:

- **route.ts**: API ingress that validates requests and enqueues research plans
- **supervisor.ts**: Orchestrates runs, seeds generation tasks, manages tournaments, and schedules agent cycles
- **worker.ts**: Dispatches tasks to appropriate agent adapters with concurrency control
- **agents/**: Individual agent adapters (generation, reflection, ranking, evolution, proximity, metaReview, statCheck, reportWriter)
- **utils/**: Model calls, persistence helpers
- **safety/**: Safety gating and policy enforcement
- **data/**: JSON file-based persistence (POC, easily replaceable with DB)

## Setup

### Environment Variables

```bash
AZURE_OPENAI_KEY=...               # Azure OpenAI API key
AZURE_OPENAI_ENDPOINT=https://...  # e.g. https://<resource>.openai.azure.com
AZURE_OPENAI_API_VERSION=...       # e.g. 2025-01-01-preview
AZURE_OPENAI_DEPLOYMENT=...        # your deployment name (used as the "model")
```

### Installation

Dependencies are already included in the main package.json. Key dependencies:

- `openai`: OpenAI API client
- `uuid`: UUID generation

## Usage

### Starting a Research Plan

```bash
curl -X POST 'http://localhost:3000/api/design/draft' \
  -H 'Content-Type: application/json' \
  -d '{
    "planId": "plan-1",
    "title": "Topical eczema formulation for molecule X",
    "description": "Design formulation to enhance skin penetration with low irritation",
    "preferences": {
      "max_hypotheses": 10
    }
  }'
```

Response:

```json
{
  "success": true,
  "planId": "plan-1",
  "statusUrl": "/api/design/draft/status/plan-1",
  "message": "Research plan enqueued successfully"
}
```

### Checking Plan Status

```bash
curl 'http://localhost:3000/api/design/draft/status/plan-1'
```

Response includes:

- Plan status (pending, seed_in_progress, completed, failed)
- Progress metrics
- Top hypotheses (ranked by Elo)
- Recent logs

## Data Persistence

Data is stored in JSON files under `app/api/design/draft/data/`:

- `research_plans.json`: Research plans
- `hypotheses.json`: Generated hypotheses with Elo ratings
- `tournament_matches.json`: Pairwise ranking results
- `logs.json`: Execution logs

## Agent Types

1. **GENERATION**: Generates testable hypotheses from research plans
2. **REFLECTION**: Critically evaluates hypotheses
3. **RANKING**: Compares pairs of hypotheses (used in tournaments)
4. **EVOLUTION**: Creates evolved variants of hypotheses
5. **PROXIMITY**: Evaluates semantic similarity between hypotheses
6. **META_REVIEW**: Analyzes overall research process and generates prompt patches
7. **STATCHECK**: Evaluates statistical soundness
8. **REPORT**: Synthesizes findings into comprehensive reports

## Safety Gate

The safety gate (`safety/gate.ts`) evaluates:

- Research plans on ingestion
- Hypotheses before persistence

Decisions: `allow`, `flag` (needs review), `block` (rejected)

## Supervisor Workflow

1. **Seed Phase**: Generate initial hypotheses (default: 10)
2. **Tournament Phase**: Pairwise ranking of top hypotheses, update Elo ratings
3. **Reflection Phase**: Reflect on top hypotheses
4. **Evolution Phase**: Generate evolved variants
5. **Meta Review Phase**: Analyze process and generate improvements

## Migration to Database

To migrate from JSON files to a database (e.g., Postgres/Prisma):

1. Replace `utils/persistence.ts` functions with database queries
2. Update schema:

   - `research_plans` table
   - `hypotheses` table (with Elo column)
   - `tournament_matches` table
   - `agent_tasks` table
   - `agent_outputs` table
   - `logs` table

3. Update supervisor.ts to use new persistence functions

## Testing

Run tests:

```bash
npm test
```

## Configuration

- `DEFAULT_SEED_COUNT`: Number of initial hypotheses (default: 10)
- `DEFAULT_CONCURRENCY`: Worker concurrency limit (default: 4)
- `DEFAULT_TIMEOUT_MS`: Task timeout (default: 60000ms)
- `INITIAL_ELO`: Starting Elo rating (default: 1500)

## Notes

- The system runs synchronously for POC but returns 202 Accepted immediately
- In production, supervisor should run in a background job queue
- File-based persistence is a POC; replace with database for production
- Safety gate uses keyword matching; enhance with ML models for production
