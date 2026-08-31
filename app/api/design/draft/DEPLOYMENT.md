# Design Draft API Deployment Notes

## Architecture

The Design Draft API runs a long-running supervisor process that generates and evaluates research hypotheses using multiple LLM calls.

### Execution Flow

1. **POST /api/design/draft** - Initiates research plan
   - Validates input
   - Creates research plan
   - **Runs supervisor synchronously** (awaits completion)
   - Returns status after completion

2. **Supervisor Process** (runs within the POST request):
   - Phase 1: Generate N seed hypotheses (N LLM calls)
   - Phase 2: Run tournament with pairwise comparisons (N*(N-1)/2 LLM calls)
   - Phase 3: Run reflection on top 5 (5 LLM calls)
   - Phase 4: Run evolution on top 5 (5 LLM calls)
   - Phase 5: Run meta review (1 LLM call)
   - **Total: ~60+ sequential LLM calls**

3. **GET /api/design/draft/status/[planid]** - Poll for status
   - Returns current plan status
   - Returns generated hypotheses
   - Returns logs

## Vercel Configuration

### Function Timeout

```json
{
  "functions": {
    "app/api/design/draft/route.ts": {
      "maxDuration": 300
    }
  }
}
```

- **Max Duration: 300 seconds (5 minutes)**
- This requires **Vercel Pro or Enterprise plan**
- Hobby plan is limited to 10 seconds

### Important Notes

1. **The supervisor runs synchronously** within the HTTP request
   - This is necessary because Vercel serverless functions don't support true background jobs
   - The function will run for up to 300 seconds
   - If it times out, the plan status will be saved as "failed"

2. **Environment Variables Required**:
   - `AZURE_OPENAI_KEY` - For LLM calls (Azure OpenAI)
   - `AZURE_OPENAI_ENDPOINT` - Azure resource endpoint (e.g. `https://<resource>.openai.azure.com`)
   - `AZURE_OPENAI_API_VERSION` - Azure OpenAI API version (e.g. `2025-01-01-preview`)
   - `AZURE_OPENAI_DEPLOYMENT` - Deployment name (used as the `model`)
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS)

3. **Database Tables Required**:
   - `design_research_plans` - Stores research plans
   - `design_hypotheses` - Stores generated hypotheses
   - `design_tournament_matches` - Stores pairwise comparison results
   - `design_logs` - Stores execution logs
   - See migration: `supabase/migrations/20250214130000_add_design_draft_persistence.sql`

## Alternative Architectures for Production

If you need to handle larger workloads or avoid timeout issues, consider:

1. **Queue-based architecture** (e.g., Vercel Cron + Queue)
   - POST endpoint just enqueues the plan
   - Separate cron job processes queued plans
   - Requires external queue (Redis, SQS, etc.)

2. **Streaming response**
   - Use Server-Sent Events to stream progress
   - Keep connection alive while supervisor runs
   - Better UX but still limited by timeout

3. **External worker service**
   - Deploy supervisor as separate long-running service
   - API just triggers the worker
   - Worker can run indefinitely

## Testing Locally

```bash
# Start local supabase
supabase start

# Run dev server
npm run dev

# Create a design
curl -X POST 'http://localhost:3000/api/design/draft' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test research plan",
    "description": "Test description",
    "preferences": {
      "max_hypotheses": 3
    }
  }'
```

For local testing, reduce `max_hypotheses` to avoid long wait times.

## Troubleshooting

### Issue: Design never completes in production

**Symptoms**: Frontend shows loading state indefinitely, no hypotheses appear

**Causes**:
1. Missing `AZURE_OPENAI_*` env vars in Vercel environment variables
2. Function timeout (exceeds 300 seconds)
3. Supabase connection issues

**Solutions**:
1. Check Vercel logs for errors
2. Verify all environment variables are set
3. Check Supabase tables exist and RLS policies allow service_role access
4. Reduce `max_hypotheses` in preferences to shorten execution time

### Issue: PostgREST schema cache errors

**Symptoms**: `Could not find the table 'public.design_*' in the schema cache`

**Solution**: Restart Supabase project to refresh PostgREST cache
- Dashboard → Settings → General → Restart project

### Issue: Vercel function timeout

**Symptoms**: Logs show incomplete execution, plan status stuck in progress

**Solution**: 
1. Upgrade to Vercel Pro or Enterprise plan
2. Reduce concurrency or max_hypotheses
3. Consider alternative architecture (queue-based)

