"use server";

import { revalidatePath } from "next/cache";
import { requireManagedStudent, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { type CardioLogInput, cardioLogSchema, type RoutineInput, routineSchema, sleepHours, type SleepLogInput, sleepLogSchema } from "@/lib/routine";
import type { ActionResult } from "@/lib/validations";
import { addDaysUtc, todaySP } from "@/lib/week";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Dados inválidos";

function refresh(studentId?: string) {
  revalidatePath("/aluno", "layout");
  if (studentId) revalidatePath(`/treinador/alunos/${studentId}`, "layout");
}

// ─── Treinador ────────────────────────────────────────────

/** Cria ou substitui a rotina do aluno (sono, cardio e mobilidade). Vale na hora. */
export async function saveRoutine(input: RoutineInput): Promise<ActionResult> {
  const parsed = routineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { studentId, cardio, mobility, ...fields } = parsed.data;
  await requireManagedStudent(studentId);

  await db.$transaction(async (tx) => {
    const routine = await tx.routine.upsert({ where: { studentId }, create: { studentId, ...fields }, update: fields });
    // Prescrições mantêm o id quando ficam na mesma posição com o mesmo tipo: os registros
    // de cardio da semana continuam contando para ela depois de uma edição.
    const old = await tx.cardioPrescription.findMany({ where: { routineId: routine.id }, orderBy: { order: "asc" } });
    const reuse = cardio.map((c, order) => (old[order]?.kind === c.kind ? old[order].id : null));
    await tx.cardioPrescription.deleteMany({ where: { routineId: routine.id, id: { notIn: reuse.filter((x): x is string => !!x) } } });
    for (const [order, c] of cardio.entries()) {
      const id = reuse[order];
      if (id) await tx.cardioPrescription.update({ where: { id }, data: { ...c, order } });
      else await tx.cardioPrescription.create({ data: { ...c, order, routineId: routine.id } });
    }
    await tx.mobilityDrill.deleteMany({ where: { routineId: routine.id } });
    if (mobility.length) await tx.mobilityDrill.createMany({ data: mobility.map((m, order) => ({ ...m, order, routineId: routine.id })) });
  });

  refresh(studentId);
  return { ok: true };
}

// ─── Aluno ────────────────────────────────────────────────

export async function logCardio(input: CardioLogInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = cardioLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { daysAgo, prescriptionId, ...data } = parsed.data;
  // Só liga a uma prescrição da própria rotina
  const valid = prescriptionId
    ? await db.cardioPrescription.findFirst({ where: { id: prescriptionId, routine: { studentId: user.id } }, select: { id: true } })
    : null;
  await db.cardioLog.create({ data: { ...data, userId: user.id, prescriptionId: valid?.id ?? null, date: addDaysUtc(todaySP(), -daysAgo) } });
  refresh();
  return { ok: true };
}

export async function deleteCardioLog(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await db.cardioLog.deleteMany({ where: { id, userId: user.id } });
  refresh();
  return { ok: true };
}

/** Registra (ou corrige) a noite de sono de hoje ou de até 6 dias atrás. */
export async function logSleep(input: SleepLogInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = sleepLogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { daysAgo, ...data } = parsed.data;
  const date = addDaysUtc(todaySP(), -daysAgo);
  const row = { ...data, hours: sleepHours(data.bedtime, data.wakeTime) };
  await db.sleepLog.upsert({ where: { userId_date: { userId: user.id, date } }, create: { ...row, userId: user.id, date }, update: row });
  refresh();
  return { ok: true };
}

/** Marca/desmarca a rotina de mobilidade como feita hoje. */
export async function toggleMobility(): Promise<ActionResult> {
  const user = await requireUser();
  const routine = await db.routine.findUnique({ where: { studentId: user.id }, select: { id: true, _count: { select: { mobility: true } } } });
  if (!routine || routine._count.mobility === 0) return { ok: false, error: "Você ainda não tem rotina de mobilidade" };
  const key = { userId: user.id, date: todaySP(), kind: "MOBILITY", refId: routine.id, slot: "" };
  const existing = await db.dailyCheck.findUnique({ where: { userId_date_kind_refId_slot: key } });
  if (existing) await db.dailyCheck.delete({ where: { id: existing.id } });
  else await db.dailyCheck.create({ data: key }).catch(() => {});
  refresh();
  return { ok: true };
}
