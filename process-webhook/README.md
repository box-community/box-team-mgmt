# process-webhook

A small Next.js service that receives [Box](https://developer.box.com/) webhooks, verifies signatures, deduplicates deliveries, and runs handling code in a [Vercel Sandbox](https://vercel.com/docs/functions/functions-api-reference/vercel-sandbox) (Box CLI, skills, and Claude Code against your Box content).

## Requirements

- Node.js (compatible with Next.js in this project)
- A Box **Custom App** with:
  - Webhook **primary** and **secondary** signing keys (for verifying `POST /api/box/webhook`)
  - **Client ID**, **client secret**, and **enterprise ID** for the same app’s server-side auth (used inside the sandbox to configure the Box CLI with CCG)
- A Vercel account (or valid **Vercel Sandbox** credentials) to create sandboxes
- An [Anthropic API key](https://console.anthropic.com/) for the non-interactive `claude` invocation inside the sandbox

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in values (Next.js loads `.env.local` locally):

   ```bash
   cp .env.example .env.local
   ```

3. Configure variables below. For a deployed app, set the same keys in your host (e.g. Vercel **Environment Variables**).

## Environment variables

Values match [`.env.example`](.env.example).

### Box — webhook verification

| Variable | Description |
| -------- | ----------- |
| `BOX_WEBHOOK_PRIMARY_KEY` | Primary signature key from Box (Developer Console → your app → webhooks). |
| `BOX_WEBHOOK_SECONDARY_KEY` | Secondary signature key (rotation). Both are used to verify incoming requests. |

### Box — sandbox / CLI (CCG)

Used to build the Box CLI environment inside the sandbox (`box configure:environments:add` with `--ccg-auth`).

| Variable | Description |
| -------- | ----------- |
| `BOX_CLIENT_ID` | Box app **Client ID**. |
| `BOX_CLIENT_SECRET` | Box app **Client Secret**. |
| `BOX_ENTERPRISE_ID` | Enterprise ID for the Box instance the app acts against. |

### Vercel Sandbox

| Variable | Description |
| -------- | ----------- |
| `VERCEL_OIDC_TOKEN` | Preferred when the app runs **on Vercel** (OIDC for Sandbox). |
| `VERCEL_TEAM_ID` | With `VERCEL_PROJECT_ID` and `VERCEL_TOKEN`, used when OIDC is not set (e.g. some local or CI setups). |
| `VERCEL_PROJECT_ID` | Vercel project ID. |
| `VERCEL_TOKEN` | Vercel token with permission to use Sandboxes. |

Set **either** `VERCEL_OIDC_TOKEN` **or** all three of `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN`.

### Vercel Sandbox — optional tuning

| Variable | Default (if unset) | Description |
| -------- | ------------------ | ----------- |
| `VERCEL_SANDBOX_RUNTIME` | `node24` | Sandbox Node runtime. |
| `VERCEL_SANDBOX_TIMEOUT_MS` | `300000` | Sandbox lifetime in ms. |
| `VERCEL_SANDBOX_VCPUS` | `1` | vCPU count for the sandbox. |

### Anthropic

| Variable | Description |
| -------- | ----------- |
| `ANTHROPIC_API_KEY` | API key for Claude (required for the `claude -p …` step in the sandbox). |

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

Use your deployed origin (e.g. `https://your-domain.com/api/box/webhook`) or a tunnel URL in development.

## Box content — “Team Management” folder

For the Box-backed team workflow, ensure a **Team Management** folder exists in Box (create it if needed), bootstrap team/task files as your process requires, and share it with the **service account** identity your app uses so the sandbox CLI can read and write that content.

## Project layout

- `app/api/box/webhook/route.ts` — HTTP handler (verification, deduplication, sandbox invocation)
- `lib/box-webhook.ts` — Signature verification and payload parsing
- `lib/vercel-sandbox.ts` — Sandbox job (Box CLI, skills, Claude)
