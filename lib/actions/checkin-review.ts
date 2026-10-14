"use server";

import { revalidatePath } from "next/cache";
import { requireManagedStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { CHECKIN_FREQUENCIES } from "@/lib/metrics";
import type { ActionResult } from "@/lib/validations";

/** Treinador escreve (ou edita) o retorno de um check-in; o aluno vê no "Hoje" e no histórico. */
export async function saveFeedback(checkInId: string, text: string): Promise<ActionResult> {
  const checkIn = await db.checkIn.findUnique({ where: { id: checkInId }, select: { userId: true, feedback: true } });
  if (!checkIn) return { ok: false, error: "Check-in não encontrado" };
  const { staff } = await requireManagedStudent(checkIn.userId);
  const feedback = text.trim();
  if (feedback.length > 3000) return { ok: false, error: "Máximo de 3000 caracteres" };

  await db.checkIn.update({
    where: { id: checkInId },
    data: feedback
      ? {
          feedback,
          feedbackById: staff.id,
          // Editar o texto avisa o aluno de novo; reabrir sem mudança não
          ...(feedback !== checkIn.feedback && { feedbackAt: new Date(), feedbackSeenAt: null }),
        }
      : { feedback: null, feedbackAt: null, feedbackById: null, feedbackSeenAt: null },
  });
  revalidatePath(`/treinador/alunos/${checkIn.userId}`, "layout");
  revalidatePath("/treinador");
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

export async function setCheckInFrequency(studentId: string, days: number): Promise<ActionResult> {
  await requireManagedStudent(studentId);
  if (!CHECKIN_FREQUENCIES.some((f) => f.days === days)) return { ok: false, error: "Frequência inválida" };
  await db.user.update({ where: { id: studentId }, data: { checkInEveryDays: days } });
  revalidatePath(`/treinador/alunos/${studentId}`, "layout");
  revalidatePath("/aluno", "layout");
  return { ok: true };
}
