const examplePayload = `{
  "type": "webhook_event",
  "id": "eb0c4e06-751f-442c-86f8-fd5bb404dbec",
  "created_at": "2026-04-18T09:00:00-07:00",
  "trigger": "FILE.UPLOADED",
  "webhook": { "id": "53", "type": "webhook" },
  "source": { "id": "73835521473", "type": "file", "name": "invoice.pdf" }
}`;

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Box Webhook v2 + Vercel Sandbox</p>
        <h1>Minimal receiver ready to validate and offload Box webhook events.</h1>
        <p className="lead">
          Send Box webhook `POST` requests to <code>/api/box/webhook</code>. The route
          verifies Box’s v2 signatures, rejects stale or malformed deliveries, applies a
          basic in-memory duplicate check, then creates a Vercel Sandbox to process the
          event payload in isolation.
        </p>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Expected environment variables</h2>
          <ul>
            <li><code>BOX_WEBHOOK_PRIMARY_KEY</code></li>
            <li><code>BOX_WEBHOOK_SECONDARY_KEY</code></li>
            <li><code>VERCEL_OIDC_TOKEN</code> or <code>VERCEL_TEAM_ID</code> + <code>VERCEL_PROJECT_ID</code> + <code>VERCEL_TOKEN</code></li>
            <li><code>VERCEL_SANDBOX_RUNTIME</code>, <code>VERCEL_SANDBOX_TIMEOUT_MS</code>, <code>VERCEL_SANDBOX_VCPUS</code> are optional</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Route behavior</h2>
          <ul>
            <li>Reads the raw request body before parsing JSON</li>
            <li>Checks Box timestamp freshness and both HMAC signatures</li>
            <li>Uses the Box event body <code>id</code> as the dedupe key</li>
            <li>Writes the event into the sandbox and runs a tiny Node processor</li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Example webhook body</h2>
        <pre>{examplePayload}</pre>
      </section>
    </main>
  );
}
