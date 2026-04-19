import { NextResponse } from "next/server";
import {
  parseBoxWebhookEvent,
  verifyBoxWebhookSignature,
  type BoxWebhookEvent,
} from "@/lib/box-webhook";
import { processWebhookInSandbox } from "@/lib/vercel-sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_RETENTION_MS = 2 * 60 * 60 * 1000;
const seenEventIds = new Map<string, number>();

function purgeExpiredEvents() {
  const now = Date.now();

  for (const [eventId, processedAt] of seenEventIds.entries()) {
    if (now - processedAt > EVENT_RETENTION_MS) {
      seenEventIds.delete(eventId);
    }
  }
}

function markInFlight(eventId: string) {
  purgeExpiredEvents();
  seenEventIds.set(eventId, Date.now());
}

function unmarkEvent(eventId: string) {
  seenEventIds.delete(eventId);
}

function wasAlreadySeen(eventId: string) {
  purgeExpiredEvents();
  return seenEventIds.has(eventId);
}

async function readAndValidateEvent(request: Request): Promise<
  | { ok: true; event: BoxWebhookEvent; deliveryId: string | null }
  | { ok: false; response: NextResponse }
> {
  const bodyText = await request.text();
  const bodyBuffer = Buffer.from(bodyText, "utf8");
  const verification = verifyBoxWebhookSignature(request.headers, bodyBuffer);

  if (!verification.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: verification.error },
        { status: verification.status },
      ),
    };
  }

  try {
    const event = parseBoxWebhookEvent(bodyText);
    return {
      ok: true,
      event,
      deliveryId: verification.deliveryId,
    };
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Invalid webhook payload.",
        },
        { status: 400 },
      ),
    };
  }
}

export async function POST(request: Request) {
  const validated = await readAndValidateEvent(request);

  if (!validated.ok) {
    return validated.response;
  }

  const { event, deliveryId } = validated;

  if (wasAlreadySeen(event.id)) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      eventId: event.id,
      deliveryId,
    });
  }

  markInFlight(event.id);

  try {
    
    const result = await processWebhookInSandbox(event);
    console.log(result);
    
    return NextResponse.json({ok: true})

  } catch (error) {
    unmarkEvent(event.id);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Sandbox execution failed.",
        eventId: event.id,
        deliveryId,
      },
      { status: 500 },
    );
  }
}
