# process-webhook

A small Next.js service that receives [Box](https://developer.box.com/) webhooks, verifies signatures, deduplicates deliveries, and runs handling code in a [Vercel Sandbox](https://vercel.com/docs/functions/functions-api-reference/vercel-sandbox).

## Requirements

- Node.js (compatible with Next.js “latest” in this project)
- A Box app with webhook signing keys
- For sandbox execution: Vercel credentials (OIDC on Vercel, or team/project/token for local or other environments)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in values:

   ```bash
   cp .env.example .env
   ```

   See [.env.example](.env.example) for all variables. At minimum you need `BOX_WEBHOOK_PRIMARY_KEY` and `BOX_WEBHOOK_SECONDARY_KEY` from Box. Sandbox access typically uses `VERCEL_OIDC_TOKEN` on Vercel, or `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN` when OIDC is not available.

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Next.js dev server |
| `npm run build`| Production build   |
| `npm run start`| Production server  |
| `npm run typecheck` | TypeScript check |

## Webhook URL

Configure Box to send events to:

`POST /api/box/webhook`

Use your deployed origin (e.g. `https://your-domain.com/api/box/webhook`) or local tunnel URL in development.

## Project layout

- `app/api/box/webhook/route.ts` — HTTP handler (verification, deduplication, sandbox invocation)
- `lib/box-webhook.ts` — Signature verification and payload parsing
- `lib/vercel-sandbox.ts` — Sandbox job that processes the event payload

## Set-up Box Folder

- Create a "Team Management" folder 
- Share it with the Service Account email