import { Prisma } from "@prisma/client";
import { after, NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { processWebhookEvent } from "@/lib/strava";

// GET: handshake de verificação da subscription do Strava.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": p.get("hub.challenge") });
  }
  return NextResponse.json({ error: "verify failed" }, { status: 403 });
}

// POST: evento { object_type, object_id, aspect_type, owner_id, updates, subscription_id }.
// Grava o evento, responde 200 na hora (o Strava exige < 2 s) e processa depois.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.object_id || !body?.owner_id) return NextResponse.json({ error: "bad payload" }, { status: 400 });

  const subId = process.env.STRAVA_SUBSCRIPTION_ID;
  if (subId && String(body.subscription_id) !== subId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const event = await db.stravaWebhookEvent.create({
    data: {
      aspectType: String(body.aspect_type),
      objectType: String(body.object_type),
      objectId: BigInt(body.object_id),
      ownerId: BigInt(body.owner_id),
      updates: body.updates ?? Prisma.JsonNull,
    },
  });

  after(() => processWebhookEvent(event.id).catch((e) => console.error("strava event error", e)));
  return NextResponse.json({ received: true });
}
