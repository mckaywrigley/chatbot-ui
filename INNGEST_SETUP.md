# Inngest Setup Guide for Design Draft API

## What is Inngest?

[Inngest](https://vercel.com/marketplace/inngest) is a workflow orchestration platform that allows you to run long-running background jobs on Vercel's serverless platform without timeout limitations.

## Why Inngest for This Project?

Your Design Draft API needs to:
1. Generate 5-10 hypotheses (5-10 LLM calls)
2. Run pairwise comparisons (10-45 LLM calls)
3. Run reflection, evolution, and meta-review (10+ LLM calls)

**Total: 25-65+ sequential LLM calls** that can take 5-15 minutes.

Vercel's serverless functions have a maximum timeout of 300 seconds (5 minutes) even on Pro/Enterprise plans. **Inngest solves this** by:
- Running workflows in the background (no timeout limits)
- Automatically checkpointing progress between steps
- Providing automatic retries on failure
- Supporting preview environments

## Setup Steps

### 1. Install Inngest Integration on Vercel

1. Go to: https://vercel.com/marketplace/inngest
2. Click **"Connect Account"** (top right)
3. Sign in or sign up for an Inngest account
4. Select your Vercel project to connect
5. Done! Your Vercel project is now connected to Inngest

### 2. Configure Environment Variables (Optional)

Inngest automatically sets up the required environment variables when you install via Vercel Marketplace. You should see:

- `INNGEST_EVENT_KEY` - For sending events to Inngest
- `INNGEST_SIGNING_KEY` - For authenticating Inngest requests

These are automatically added to your Vercel project settings.

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Add Inngest integration for background job processing"
git push
```

Vercel will automatically deploy and Inngest will discover your functions at `/api/inngest`.

### 4. Verify Setup

After deployment:

1. Go to your [Inngest Dashboard](https://app.inngest.com/)
2. You should see your `chatbot-ui` app
3. Check that the `process-design-draft` function is registered
4. Test by creating a new design in your app

## How It Works

### Before (With Timeouts ❌)

```
User → POST /api/design/draft
      ↓
      Supervisor runs synchronously
      ↓ (times out after 300s)
      ❌ Function killed, work lost
```

### After (With Inngest ✅)

```
User → POST /api/design/draft
      ↓
      Save plan to DB
      ↓
      Trigger Inngest event
      ↓
      Return 202 Accepted immediately
      
      (Meanwhile, in background...)
      Inngest → Runs supervisor
              ↓
              Saves progress after each step
              ↓
              Completes (no time limit!)
              ↓
              Frontend polls /api/design/draft/status
```

## Code Architecture

### Files Created/Modified

1. **`lib/inngest/client.ts`** - Inngest client configuration
2. **`lib/inngest/functions.ts`** - Background job definitions
3. **`app/api/inngest/route.ts`** - Inngest API endpoint (required)
4. **`app/api/design/draft/route.ts`** - Updated to trigger Inngest instead of running synchronously

### The Inngest Function

```typescript
export const processDesignDraft = inngest.createFunction(
  {
    id: "process-design-draft",
    retries: 2 // Automatic retries on failure
  },
  { event: "design/draft.requested" },
  async ({ event, step }) => {
    // Step 1: Fetch plan
    const plan = await step.run("fetch-research-plan", async () => {
      return await getResearchPlan(event.data.planId)
    })

    // Step 2: Run supervisor
    const result = await step.run("run-supervisor", async () => {
      return await supervisorEnqueue(plan)
    })

    return { success: true }
  }
)
```

## Testing Locally

Inngest provides a dev server for local testing:

```bash
# Terminal 1: Start your Next.js app
npm run dev

# Terminal 2: Start Inngest dev server
npx inngest-cli@latest dev

# The Inngest dev server will automatically discover functions at:
# http://localhost:3000/api/inngest
```

Then:
1. Go to http://localhost:8288 (Inngest dev UI)
2. Create a design in your app
3. Watch the function execute in real-time in the Inngest UI

## Monitoring & Debugging

### Inngest Dashboard

Go to https://app.inngest.com/ to:
- View all function executions
- See execution logs and timings
- Replay failed functions
- Monitor performance

### Vercel Logs

Function logs are still visible in Vercel:
- Initial request logs: Vercel Functions logs
- Background execution logs: Inngest Dashboard

## Free Tier Limits

Inngest's free tier includes:
- **100,000 function executions per month**
- Unlimited functions
- Unlimited steps
- 7-day log retention

For your use case (5-10 designs per day):
- ~150-300 executions/month
- Well within free tier limits! 🎉

## Troubleshooting

### Issue: Functions not showing in Inngest Dashboard

**Solution:**
1. Make sure you deployed to Vercel after installing Inngest
2. Check `/api/inngest` endpoint is accessible: `https://your-domain.vercel.app/api/inngest`
3. Verify environment variables are set in Vercel settings

### Issue: Events not triggering functions

**Solution:**
1. Check Inngest event names match exactly: `"design/draft.requested"`
2. Verify `inngest.send()` is being called in your route
3. Check Inngest Dashboard → Events tab to see if events are being received

### Issue: Function timing out

**Good news:** Inngest functions don't have timeout limits! If a function is taking too long:
1. Check Inngest Dashboard for actual execution time
2. Consider breaking into more `step.run()` calls for better checkpointing
3. Check for LLM API rate limits

## Alternative: Break Into Smaller Steps

For even more granular control, you can break the supervisor into multiple steps:

```typescript
export const processDesignDraft = inngest.createFunction(
  { id: "process-design-draft" },
  { event: "design/draft.requested" },
  async ({ event, step }) => {
    // Phase 1: Generate seeds
    await step.run("generate-seeds", async () => {
      return await generateSeeds(planId)
    })

    // Phase 2: Run tournament
    await step.run("run-tournament", async () => {
      return await runTournament(planId)
    })

    // Phase 3: Reflection
    await step.run("run-reflection", async () => {
      return await runReflection(planId)
    })
    
    // ... etc
  }
)
```

Each step is checkpointed, so if one fails, it can retry just that step.

## Cost Comparison

### Without Inngest (Vercel Pro)
- Need Vercel Pro: $20/month minimum
- Still limited to 300 seconds
- Jobs fail if they exceed timeout

### With Inngest
- Works on Vercel Hobby (free)
- Inngest Free tier: $0/month (100K executions)
- No timeout limits
- Better monitoring and retry logic

**Recommendation:** Use Inngest! It's designed for exactly this use case.

## Next Steps

1. ✅ Install Inngest via Vercel Marketplace
2. ✅ Deploy your updated code
3. ✅ Test creating a design
4. ✅ Monitor execution in Inngest Dashboard
5. ✅ Enjoy unlimited execution time! 🚀

## Learn More

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest Next.js Guide](https://www.inngest.com/docs/getting-started/nextjs-guide)
- [Vercel Marketplace Listing](https://vercel.com/marketplace/inngest)

