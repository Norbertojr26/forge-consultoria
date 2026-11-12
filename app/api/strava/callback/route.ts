import { auth } from "@clerk/nextjs/server";
import { after, NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appUrl, backfillRecentActivities, exchangeCodeForToken, verifyState } from "@/lib/strava";

// Recebe o code do Strava, troca por token, salva a conexão e importa as últimas atividades.
export async function GET(req: NextRequest) {
  const back = (status: string, reason?: string) =>
    NextResponse.redirect(
      `${appUrl()}/aluno/perfil?strava=${status}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`,
    );

  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(`${appUrl()}/entrar`);

  const params = req.nextUrl.searchParams;
  const error = params.get("error");
  if (error) return back("erro", error);

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return back("erro", "missing_params");
  if (verifyState(state) !== userId) return back("erro", "bad_state");

  const scope = params.get("scope") ?? "";
  if (!scope.split(",").includes("activity:read_all")) return back("erro", "missing_scope");

  let token;
  try {
    token = await exchangeCodeForToken(code);
  } catch (e) {
    console.error("strava callback: troca do code falhou", e);
    return back("erro", "token_exchange");
  }
  const athlete = token.athlete;
  if (!athlete) return back("erro", "no_athlete");

  // O mesmo atleta Strava não pode ficar ligado a duas contas FORGE
  const taken = await db.stravaConnection.findUnique({ where: { athleteId: BigInt(athlete.id) } });
  if (taken && taken.userId !== userId) return back("erro", "athlete_in_use");

  const data = {
    athleteId: BigInt(athlete.id),
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: new Date(token.expires_at * 1000),
    scope,
    firstName: athlete.firstname,
    lastName: athlete.lastname,
    profilePicture: athlete.profile_medium || athlete.profile,
  };
  await db.stravaConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });

  // Importa as últimas 30 atividades depois de responder (não segura o redirect)
  after(() => backfillRecentActivities(userId).catch((e) => console.error("strava backfill falhou", e)));

  return back("conectado");
}
