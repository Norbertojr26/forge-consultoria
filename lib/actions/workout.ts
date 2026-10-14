"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/validations";

/** Dia de treino de um plano ENVIADO e ATIVO do próprio aluno. */
async function ownedDay(dayId: string, userId: string) {
  return db.workoutDay.findFirst({
    where: { id: dayId, plan: { studentId: userId, active: true, sentAt: { not: null } } },
    select: { id: true },
  });
}

async function ownedSession(sessionId: string, userId: string) {
  return db.workoutSession.findFirst({ where: { id: sessionId, userId }, select: { id: true, dayId: true, finishedAt: true } });
}

/** Retoma a sessão aberta do dia (se houver) ou inicia uma nova. */
export async function startSession(dayId: string): Promise<ActionResult & { sessionId?: string }> {
  const user = await requireUser();
  if (!(await ownedDay(dayId, user.id))) return { ok: false, error: "Treino não encontrado" };

  const open = await db.workoutSession.findFirst({
    where: { userId: user.id, dayId, finishedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (open) return { ok: true, sessionId: open.id };
  const s = await db.workoutSession.create({ data: { userId: user.id, dayId } });
  return { ok: true, sessionId: s.id };
}

const setSchema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  setNumber: z.number().int().min(1).max(20),
  reps: z.number().int().min(0).max(500).nullable(),
  loadKg: z.number().min(0).max(1000).nullable(),
});

/** Marca (ou atualiza) uma série concluída. */
export async function logSet(input: z.infer<typeof setSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados da série inválidos" };
  const { sessionId, itemId, setNumber, reps, loadKg } = parsed.data;

  const session = await ownedSession(sessionId, user.id);
  if (!session || session.finishedAt) return { ok: false, error: "Sessão encerrada" };
  const item = await db.workoutItem.findFirst({ where: { id: itemId, dayId: session.dayId }, select: { sets: true, exerciseId: true } });
  if (!item || setNumber > item.sets) return { ok: false, error: "Série inválida" };

  await db.setLog.upsert({
    where: { sessionId_itemId_setNumber: { sessionId, itemId, setNumber } },
    create: { sessionId, itemId, setNumber, reps, loadKg, exerciseId: item.exerciseId },
    update: { reps, loadKg, completedAt: new Date() },
  });
  return { ok: true };
}

/** Registra o RIR (repetições que ainda daria) de uma série já concluída. */
export async function rateSet(sessionId: string, itemId: string, setNumber: number, rir: number | null): Promise<ActionResult> {
  const user = await requireUser();
  if (rir != null && (!Number.isInteger(rir) || rir < 0 || rir > 10)) return { ok: false, error: "RIR inválido" };
  const session = await ownedSession(sessionId, user.id);
  if (!session) return { ok: false, error: "Sessão não encontrada" };
  const r = await db.setLog.updateMany({ where: { sessionId, itemId, setNumber }, data: { rir } });
  return r.count ? { ok: true } : { ok: false, error: "Conclua a série antes de avaliar" };
}

/** Desmarca uma série (toque errado). */
export async function unlogSet(sessionId: string, itemId: string, setNumber: number): Promise<ActionResult> {
  const user = await requireUser();
  const session = await ownedSession(sessionId, user.id);
  if (!session || session.finishedAt) return { ok: false, error: "Sessão encerrada" };
  await db.setLog.deleteMany({ where: { sessionId, itemId, setNumber } });
  return { ok: true };
}

export async function finishSession(sessionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const session = await ownedSession(sessionId, user.id);
  if (!session) return { ok: false, error: "Sessão não encontrada" };
  if (!session.finishedAt) await db.workoutSession.update({ where: { id: sessionId }, data: { finishedAt: new Date() } });
  revalidatePath("/aluno", "layout");
  return { ok: true };
}
