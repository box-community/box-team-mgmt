# Team Management powered by Agent Skills & Box

This repository includes agent skills and a Next.js webhook processor for Box. Follow the steps below to go from a new Box account to a deployed webhook endpoint.

## 1. Create a Box account

Sign up for a free account at [box.com](https://www.box.com/) if you do not already have one.

## 2. Create and configure a Platform app

1. Open the [Box Developer Console](https://app.box.com/developers/console).
2. Create a new **Custom App** (Box’s platform integration type used for webhooks and server-side flows).
3. Complete the **Configuration** tab: set authentication, redirect URIs, and any scopes your integration needs, following [Box’s app configuration guides](https://developer.box.com/guides/getting-started/first-application/).
4. For the webhook service in this repo, enable **webhooks** for the events you care about and copy the **Primary** and **Secondary** webhook signing keys (you will add them to the Next.js app’s environment).

## 3. Install agent skills (`npx skills`)

From the **repository root** (where [`skills-lock.json`](skills-lock.json) lives), install the skills pinned in the lockfile into your agent directories:

```bash
npx skills experimental_install
```

This restores the skills listed in `skills-lock.json` (for example the Box and task-management skills). If you add new skills later, use `npx skills add <source>` and commit the updated lockfile.

## 4. Configure and deploy the Next.js app

The app lives in [`process-webhook/`](process-webhook/).

1. Install dependencies and set environment variables:

   ```bash
   cd process-webhook
   npm install
   cp .env.example .env
   ```

2. Edit `.env` with your Box webhook signing keys and Vercel sandbox credentials. See [`process-webhook/.env.example`](process-webhook/.env.example) for all variables. On Vercel, prefer `VERCEL_OIDC_TOKEN`; for local or non-OIDC setups, use `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN` as documented there.

3. Deploy (for example with [Vercel](https://vercel.com/docs)): connect the repo or the `process-webhook` directory as a project, add the same environment variables in the dashboard, and deploy. More detail is in [`process-webhook/README.md`](process-webhook/README.md).

## 5. Point Box at your webhook URL

After deployment, your handler is exposed at:

`https://<your-deployment-host>/api/box/webhook`

In the Box Developer Console, open your app’s webhook settings and set the **callback URL** to that address (HTTP `POST`). Save and use Box’s tools to send a test delivery if available.

---

For day-to-day development of the webhook service, see [`process-webhook/README.md`](process-webhook/README.md).
