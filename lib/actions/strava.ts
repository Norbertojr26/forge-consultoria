"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deauthorize, getValidAccessToken } from "@/lib/strava";
import type { ActionResult } from "@/lib/validations";

/** Desconecta o Strava: revoga o acesso do app e apaga a conexão. Atividades já importadas ficam. */
export async function disconnectStrava(): Promise<ActionResult> {
  const user = await requireUser();
  const token = await getValidAccessToken(user.id).catch(() => null);
  if (token) await deauthorize(token);
  await db.stravaConnection.deleteMany({ where: { userId: user.id } });
  revalidatePath("/aluno", "layout");
  return { ok: true };
}
