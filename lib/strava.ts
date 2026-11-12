import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";

// Cliente da API do Strava: OAuth, refresh automático do token e conversão de atividade em CardioLog.

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_OAUTH = "https://www.strava.com/oauth/token";

export const STRAVA_SCOPES = "read,activity:read_all,profile:read_all";

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

export interface StravaTokenResponse {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix, segundos
  expires_in: number;
  athlete?: { id: number; firstname: string; lastname: string; profile: string; profile_medium: string };
}

/** Campos usados da atividade (o resumo da listagem e o detalhe têm todos eles). */
export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  start_date_local?: string;
  distance: number; // metros
  moving_time: number; // segundos
  average_heartrate?: number;
  description?: string | null;
}

// ─── State do OAuth (assinado com o client secret, evita CSRF) ─────────────

function sign(payload: string) {
  return crypto.createHmac("sha256", process.env.STRAVA_CLIENT_SECRET!).update(payload).digest("hex").slice(0, 32);
}

export function createState(userId: string) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const ts = Date.now().toString(36);
  return `${userId}.${nonce}.${ts}.${sign(`${userId}:${nonce}:${ts}`)}`;
}

/** Devolve o userId do state se a assinatura confere e tem menos de 15 min. */
export function verifyState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [userId, nonce, ts, sig] = parts;
  const expected = sign(`${userId}:${nonce}:${ts}`);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Date.now() - parseInt(ts, 36) > 15 * 60 * 1000) return null;
  return userId;
}

// ─── OAuth ────────────────────────────────────────────────

export function getAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: `${appUrl()}/api/strava/callback`,
    scope: STRAVA_SCOPES,
    approval_prompt: "auto",
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Strava OAuth ${res.status}: ${await res.text()}`);
  return res.json();
}

export const exchangeCodeForToken = (code: string) => tokenRequest({ code, grant_type: "authorization_code" });

/** Access token válido do aluno; renova se faltar menos de 5 min para expirar. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const conn = await db.stravaConnection.findUnique({ where: { userId } });
  if (!conn) return null;
  if (conn.expiresAt.getTime() - Date.now() > 5 * 60 * 1000) return conn.accessToken;

  const t = await tokenRequest({ refresh_token: conn.refreshToken, grant_type: "refresh_token" });
  await db.stravaConnection.update({
    where: { userId },
    data: { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: new Date(t.expires_at * 1000) },
  });
  return t.access_token;
}

/** Revoga o acesso do app no Strava (melhor esforço). */
export async function deauthorize(accessToken: string) {
  await fetch("https://www.strava.com/oauth/deauthorize", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

// ─── Atividades ───────────────────────────────────────────

async function stravaGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${STRAVA_API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Strava GET ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export const fetchStravaActivity = (id: bigint | number, token: string) =>
  stravaGet<StravaActivity>(`/activities/${id}?include_all_efforts=false`, token);

export const listRecentActivities = (token: string, perPage = 30) =>
  stravaGet<StravaActivity[]>(`/athlete/activities?per_page=${perPage}&page=1`, token);

// ─── Conversão para CardioLog ─────────────────────────────

const NOT_CARDIO = ["weighttraining", "crossfit", "yoga", "pilates", "workout", "rockclimbing"];

/** Tipo do Strava → kind do CardioLog FORGE (LISS para cardio contínuo, OUTRO para o resto). */
export function mapStravaTypeToKind(type: string): string {
  const t = type.toLowerCase();
  if (NOT_CARDIO.includes(t)) return "OUTRO";
  if (/ride|bike|run|walk|hike|swim|row|elliptical|stair|ski|skate/.test(t)) return "LISS";
  return "OUTRO";
}

const MODALITY: Record<string, string> = {
  Run: "Corrida",
  TrailRun: "Corrida (trilha)",
  VirtualRun: "Corrida (esteira)",
  Ride: "Bike (externa)",
  MountainBikeRide: "Mountain bike",
  GravelRide: "Bike gravel",
  VirtualRide: "Bike indoor",
  EBikeRide: "Bike elétrica",
  Walk: "Caminhada",
  Hike: "Trilha",
  Swim: "Natação",
  Rowing: "Remo",
  VirtualRow: "Remo indoor",
  Elliptical: "Elíptico",
  StairStepper: "Escada",
  WeightTraining: "Musculação (externa)",
  Crossfit: "Crossfit",
  Yoga: "Yoga",
  Pilates: "Pilates",
  Workout: "Treino",
};
export const mapStravaTypeToModality = (type: string) => MODALITY[type] ?? type;

/** Cria ou atualiza o CardioLog da atividade (idempotente pelo stravaActivityId). */
export async function upsertCardioLogFromActivity(userId: string, a: StravaActivity) {
  const type = a.sport_type || a.type;
  // start_date_local evita que um treino à noite caia no dia seguinte (UTC)
  const day = (a.start_date_local ?? a.start_date).slice(0, 10);
  const data = {
    date: new Date(`${day}T00:00:00Z`),
    kind: mapStravaTypeToKind(type),
    modality: mapStravaTypeToModality(type).slice(0, 60),
    durationMin: Math.max(1, Math.round(a.moving_time / 60)),
    distanceKm: a.distance > 0 ? Math.round((a.distance / 1000) * 100) / 100 : null,
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    notes: (a.description || a.name || "").slice(0, 300) || null,
  };
  await db.cardioLog.upsert({
    where: { stravaActivityId: BigInt(a.id) },
    create: { userId, ...data, stravaActivityId: BigInt(a.id), source: "STRAVA" },
    update: data,
  });
}

/** Importa as últimas atividades do aluno (logo após conectar). */
export async function backfillRecentActivities(userId: string, count = 30) {
  const token = await getValidAccessToken(userId);
  if (!token) return 0;
  const activities = await listRecentActivities(token, count);
  let n = 0;
  for (const a of activities) {
    try {
      await upsertCardioLogFromActivity(userId, a);
      n++;
    } catch (e) {
      console.error("strava backfill: atividade falhou", a.id, e);
    }
  }
  await db.stravaConnection.update({ where: { userId }, data: { lastSyncAt: new Date() } });
  return n;
}

// ─── Eventos do webhook ───────────────────────────────────

export async function processWebhookEvent(eventId: string) {
  const event = await db.stravaWebhookEvent.findUnique({ where: { id: eventId } });
  if (!event) return;
  const done = (errorMessage?: string) =>
    db.stravaWebhookEvent.update({ where: { id: eventId }, data: { processedAt: new Date(), errorMessage } });

  try {
    const conn = await db.stravaConnection.findUnique({ where: { athleteId: event.ownerId } });
    if (!conn) return void (await done("no connection"));

    // Atleta revogou o acesso no painel do Strava
    if (event.objectType === "athlete") {
      const updates = (event.updates ?? {}) as Record<string, unknown>;
      if (String(updates.authorized) === "false") await db.stravaConnection.delete({ where: { id: conn.id } });
      return void (await done());
    }
    if (event.objectType !== "activity") return void (await done());

    if (event.aspectType === "delete") {
      await db.cardioLog.deleteMany({ where: { stravaActivityId: event.objectId, userId: conn.userId } });
      return void (await done());
    }

    const token = await getValidAccessToken(conn.userId);
    if (!token) throw new Error("no valid token");
    const activity = await fetchStravaActivity(event.objectId, token);
    await upsertCardioLogFromActivity(conn.userId, activity);
    await db.stravaConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
    await done();
  } catch (e) {
    await done((e as Error).message.slice(0, 500));
  }
}
