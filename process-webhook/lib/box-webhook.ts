import crypto from "node:crypto";

export type BoxWebhookEvent = {
  type: "webhook_event";
  id: string;
  created_at: string;
  trigger: string;
  webhook?: {
    id: string;
    type: string;
  };
  source?: {
    id: string;
    type: string;
    name?: string;
  };
  created_by?: {
    id: string;
    type: string;
    name?: string;
    login?: string;
  };
};

type VerificationResult =
  | {
      ok: true;
      deliveryId: string | null;
      deliveryTimestamp: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

const MAX_WEBHOOK_AGE_MS = 10 * 60 * 1000;

function computeDigest(secret: string, body: Buffer, timestamp: string): string {
  return crypto.createHmac("sha256", secret).update(body).update(timestamp).digest("base64");
}

function timingSafeBase64Equals(expected: string, received: string | null): boolean {
  if (!received) {
    return false;
  }

  try {
    const expectedBuffer = Buffer.from(expected, "base64");
    const receivedBuffer = Buffer.from(received, "base64");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

export function parseBoxWebhookEvent(bodyText: string): BoxWebhookEvent {
  const parsed = JSON.parse(bodyText) as Partial<BoxWebhookEvent>;

  if (parsed.type !== "webhook_event" || !parsed.id || !parsed.trigger || !parsed.created_at) {
    throw new Error("Request body is not a valid Box webhook v2 event.");
  }

  return parsed as BoxWebhookEvent;
}

export function verifyBoxWebhookSignature(
  headers: Headers,
  body: Buffer,
): VerificationResult {
  const deliveryTimestamp = headers.get("box-delivery-timestamp");
  const deliveryId = headers.get("box-delivery-id");
  const primarySignature = headers.get("box-signature-primary");
  const secondarySignature = headers.get("box-signature-secondary");
  const primaryKey = process.env.BOX_WEBHOOK_PRIMARY_KEY;
  const secondaryKey = process.env.BOX_WEBHOOK_SECONDARY_KEY;

  if (!primaryKey || !secondaryKey) {
    return {
      ok: false,
      status: 500,
      error: "Missing Box webhook signature keys in the environment.",
    };
  }

  if (!deliveryTimestamp || !primarySignature || !secondarySignature) {
    return {
      ok: false,
      status: 400,
      error: "Missing required Box signature headers.",
    };
  }

  const parsedTimestamp = Date.parse(deliveryTimestamp);

  if (Number.isNaN(parsedTimestamp)) {
    return {
      ok: false,
      status: 400,
      error: "Invalid BOX-DELIVERY-TIMESTAMP header.",
    };
  }

  if (Math.abs(Date.now() - parsedTimestamp) > MAX_WEBHOOK_AGE_MS) {
    return {
      ok: false,
      status: 400,
      error: "Box webhook delivery is older than 10 minutes.",
    };
  }

  const primaryDigest = computeDigest(primaryKey, body, deliveryTimestamp);
  const secondaryDigest = computeDigest(secondaryKey, body, deliveryTimestamp);
  const primaryValid = timingSafeBase64Equals(primaryDigest, primarySignature);
  const secondaryValid = timingSafeBase64Equals(secondaryDigest, secondarySignature);

  if (!primaryValid && !secondaryValid) {
    return {
      ok: false,
      status: 401,
      error: "Box webhook signature verification failed.",
    };
  }

  return {
    ok: true,
    deliveryId,
    deliveryTimestamp,
  };
}
