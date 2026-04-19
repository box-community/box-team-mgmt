import { Sandbox } from "@vercel/sandbox";
import type { BoxWebhookEvent } from "./box-webhook";

type SandboxJobResult = {
  sandboxId: string;
};

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_VCPUS = 1;
const DEFAULT_RUNTIME = "node24";

const PROCESSOR_SOURCE = `
import { readFile } from "node:fs/promises";

const filePath = process.argv[2];
const payload = JSON.parse(await readFile(filePath, "utf8"));

const summary = {
  processedAt: new Date().toISOString(),
  eventId: payload.id,
  trigger: payload.trigger,
  sourceId: payload.source?.id ?? null,
  sourceType: payload.source?.type ?? null,
  sourceName: payload.source?.name ?? null
};

console.log(JSON.stringify(summary));
`;

const BOX_CONFIG_SOURCE = `
{
  "boxAppSettings": {
    "clientID": "${process.env.BOX_CLIENT_ID}",
    "clientSecret": "${process.env.BOX_CLIENT_SECRET}",
    "appAuth": {
      "publicKeyID": "",
      "privateKey": "",
      "passphrase": ""
    }
  },
  "enterpriseID": "${process.env.BOX_ENTERPRISE_ID}"
}
`;

function getCredentials() {
  if (process.env.VERCEL_OIDC_TOKEN) {
    return {};
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;

  if (teamId && projectId && token) {
    return { teamId, projectId, token };
  }

  throw new Error(
    "Missing Vercel Sandbox credentials. Set VERCEL_OIDC_TOKEN or VERCEL_TEAM_ID, VERCEL_PROJECT_ID, and VERCEL_TOKEN.",
  );
}

export async function processWebhookInSandbox(
  event: BoxWebhookEvent,
): Promise<SandboxJobResult> {
  
  const sandbox = await Sandbox.create({
    ...getCredentials(),
    runtime: process.env.VERCEL_SANDBOX_RUNTIME ?? DEFAULT_RUNTIME,
    timeout: Number(process.env.VERCEL_SANDBOX_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
    resources: {
      vcpus: Number(process.env.VERCEL_SANDBOX_VCPUS ?? DEFAULT_VCPUS),
    },
  });

  try {
    await sandbox.mkDir("jobs");
    
    await sandbox.writeFiles([
      {
        path: "jobs/event.json",
        content: Buffer.from(JSON.stringify(event, null, 2)),
      },
      {
        path: "jobs/processor.mjs",
        content: Buffer.from(PROCESSOR_SOURCE),
      },
      {
        path: "jobs/config.json",
        content: Buffer.from(BOX_CONFIG_SOURCE),
      },
    ]);


    // Install Box CLI globally
    const installBoxCLI = await sandbox.runCommand({
      cmd: 'npm',
      args: ['install', '-g', '@box/cli'],
      stderr: process.stderr,
      stdout: process.stdout,
      sudo: true,
    });
    if (installBoxCLI.exitCode !== 0) throw new Error('Box CLI install failed');

    //console.log(await installBoxCLI.stdout());

    // Run an authenticated Claude Code command in non-interactive (-p) mode
    const configureBoxEnvironmentCLI = await sandbox.runCommand({
      cmd: 'box',
      args: [
        'configure:environments:add',
        './jobs/config.json',
        '--ccg-auth',
        '--name', 'ci-ccg',
        '--set-as-current'
      ],
      stderr: process.stderr,
      stdout: process.stdout,
    });

    //console.log(await configureBoxEnvironmentCLI.stdout());

    const runBoxCLI = await sandbox.runCommand({
      cmd: 'box',
      args: [
        'users:get', 'me'
      ],
      stderr: process.stderr,
      stdout: process.stdout,
    });

    //console.log(await runBoxCLI.stdout());

    const installClaudeCLI = await sandbox.runCommand({
      cmd: 'npm',
      args: ['install', '-g', '@anthropic-ai/claude-code'],
      stderr: process.stderr,
      stdout: process.stdout,
      sudo: true,
    });
    if (installClaudeCLI.exitCode !== 0) throw new Error('Claude CLI install failed');

    const runClaudeCLI = await sandbox.runCommand({
      cmd: 'claude',
      args: [
        '-p',
        '/box-team-management sync',
        '--output-format', 'json',
        '--dangerously-skip-permissions', // OK inside a sandbox
      ],
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
      },
      stderr: process.stderr,
      stdout: process.stdout,
    });

    /*const command = await sandbox.runCommand({
      cmd: "node",
      args: ["jobs/processor.mjs", "jobs/event.json"],
      cwd: "/vercel/sandbox",
    });*/

    return {
      sandboxId: sandbox.sandboxId
    };
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}
