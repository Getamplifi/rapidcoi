# RapidCOI

"Your COI. In minutes." — automates Certificate of Liability Insurance requests and issuance for contractors and P&C insurance agents.

## Stack

- Vite + React
- Supabase (Postgres + Auth + RLS)
- Vercel (hosting + serverless functions for PDF generation and email)
- pdf-lib (fills the ACORD 25 form server-side)
- Resend (transactional email)

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values (see below)
3. `npm run dev`

## Environment variables

| Variable | Where it's used | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | client | safe to expose, RLS protects data |
| `VITE_SUPABASE_ANON_KEY` | client | safe to expose, RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | server (`/api` functions only) | never prefix with `VITE_` — this bypasses RLS |
| `RESEND_API_KEY` | server (`/api` functions only) | never prefix with `VITE_` |

In Vercel: set these in Project Settings → Environment Variables, scoped to **Production** only, so preview deploys can't touch live data. Names must be an exact, case-sensitive match.

## Roles

One login URL, three roles detected from the `profiles` table after magic-link auth:

- **Contractor** — onboards once with business + policy info, then submits lightweight COI requests (just the new job address + any exceptions)
- **Agent** — reviews auto-generated COIs in a queue and sends them on to the client/underwriting
- **Admin** — account and carrier management (minimal in v1)

## COI generation flow

1. Contractor submits a request (certificate holder address + exceptions Y/N)
2. A Vercel serverless function (`/api/generate-coi`) auto-fills the ACORD 25 using `pdf-lib` — no agent approval needed to trigger this
3. Request status is set to `ready_for_review` (no exceptions) or `flagged` (exceptions present, may need agent edits)
4. Agent gets notified, reviews/edits the PDF in the queue, and clicks **Send**
5. `/api/send-coi` emails the finished COI to the client/underwriting via Resend, status → `sent`

## Emergency off switch

To stop all outbound COI emails without taking the app down, remove `RESEND_API_KEY` from Vercel's Production environment variables and redeploy. `/api/send-coi` will fail closed (no key, no send) rather than silently succeeding.

## Deployment

Every push to `main` auto-deploys via Vercel. Preview deployments are created for other branches/PRs and do not have access to production Supabase or Resend keys.
