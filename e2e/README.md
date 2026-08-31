# Nightly QA

A production health check that answers one question every morning: **is
ShadowAI working, end to end, for a real user?**

It runs against the deployed app, not a local dev server — a health check that
passes on localhost while production is down is worse than no health check.

## What it covers

| Project    | Checks                                                                                      | Cost          |
| ---------- | ------------------------------------------------------------------------------------------- | ------------- |
| `setup`    | Signs in once, captures the session + workspace id for everything below.                     | free          |
| `public`   | Login page renders; a bad password is rejected; a **real signup** completes (then deleted).  | free          |
| `smoke`    | Dashboard loads for a signed-in user; a design can be created and opened.                    | free          |
| `pipeline` | Literature → hypotheses → design → report, against the live AI stack.                        | **real spend** |

`public` deliberately does **not** depend on `setup`. If the QA password
expires, you still want to know whether the login page renders — that is
exactly the moment the signal matters most.

### What the pipeline actually asserts

Shape assertions are close to worthless here: a phase that returns
`{ papers: [] }` has "succeeded" and is completely broken. So the checks are
about substance, and each one maps to a regression that has actually happened:

- **Literature** — more than a handful of papers came back; at least 80% have a
  usable title (titles were silently `null` for most non-OpenAlex sources once);
  and no two papers share a normalised title (the same study was arriving twice,
  once from PubMed and once from the web).
- **Hypotheses** — non-trivial text, and at least one cites a selected paper
  (`basedOnPaperIds` was being dropped, leaving hypotheses with no visible link
  to the literature).
- **Design** — the sections a protocol is useless without are present
  (conditions table, materials list, procedure, data collection), no section is
  effectively empty, and the conditions table is a real markdown table rather
  than prose.
- **Report** — a draft is produced from a staged CSV, with aim / results /
  conclusion.

## Running it

```bash
npm run qa:smoke      # free: public + workspace checks
npm run qa:pipeline   # SPENDS MONEY: the full AI chain
npm run qa            # everything
npm run qa:report     # open the HTML report from the last run
```

Set the env vars below in a local shell (or `.env.local`) first. Playwright's
browser is needed once: `npx playwright install chromium`.

## Required CI secrets

Add under **Settings → Secrets and variables → Actions**.

| Secret                      | Why                                                                 |
| --------------------------- | ------------------------------------------------------------------- |
| `E2E_EMAIL`                 | Long-lived QA account. Use a dedicated account, not a founder's.     |
| `E2E_PASSWORD`              | Its password.                                                        |
| `E2E_SUPABASE_URL`          | Supabase project URL (same value as `NEXT_PUBLIC_SUPABASE_URL`).     |
| `SUPABASE_SERVICE_ROLE_KEY` | Deletes the throwaway signup user; stages the report's data file.    |
| `RESEND_API_KEY`            | Sends the digest. Same key the app uses for invites.                 |
| `QA_REPORT_TO`              | Comma-separated recipients for the nightly email.                    |

Optional **variables** (not secrets):

| Variable             | Default                     | Why                                     |
| -------------------- | --------------------------- | --------------------------------------- |
| `E2E_BASE_URL`       | `https://app.shadowai.work` | Point the suite at a preview instead.   |
| `E2E_SIGNUP_DOMAIN`  | `shadowai.work`             | Domain for the throwaway signup address.|
| `EMAIL_FROM_ADDRESS` | app default                 | Must be a Resend-verified domain.       |

> **`app.shadowai.work`, not `shadowai.work`.** The apex domain serves the
> marketing site and 404s on `/login`. The app is on the `app.` subdomain.

## Schedule and cost

Runs at **02:30 UTC (08:00 IST)** so the result is waiting at the start of the
day, and off-peak for Azure quota. Trigger it by hand from the Actions tab —
`workflow_dispatch` takes a `suite` input, so `smoke` gives you the free checks
without the AI spend.

The pipeline project is **never retried**. A retry would buy another full run of
Azure + PaperFinder spend to tell you what the first failure already said.

## Cleaning up after itself

- The signup user is deleted in a `finally`, so it goes even when the assertion
  before it failed — a failed signup can still have created the auth row.
- Designs created by the suite are deleted through the app's own API.
- The staged CSV is removed from storage and from `files`.

All cleanup is best-effort and never fails the run: a leaked test row is untidy,
but turning a healthy night red over it would train you to ignore the email.

## When it fails

The digest names the failing check and quotes the error. Traces, screenshots and
video are on the CI run as the `playwright-report` artefact — download it and
`npx playwright show-report` to step through the failure frame by frame.
