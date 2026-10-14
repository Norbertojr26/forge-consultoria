"use server";

import { randomUUID } from "node:crypto";
import type { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireManagedStudent, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { MUSCLE_GROUPS } from "@/lib/exercises";
import { deleteObject, putObject } from "@/lib/storage";
import type { ActionResult } from "@/lib/validations";
import { type ExerciseInput, exerciseSchema, type PlanInput, planSchema } from "@/lib/validations-workout";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Dados inválidos";

/** Cria ou substitui um plano inteiro (dias e exercícios) numa transação. */
export async function savePlan(input: PlanInput): Promise<ActionResult & { planId?: string }> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { planId, studentId, name, notes, days } = parsed.data;
  const { staff } = await requireManagedStudent(studentId);

  const exerciseIds = [...new Set(days.flatMap((d) => d.items.map((i) => i.exerciseId)))];
  const found = await db.exercise.count({ where: { id: { in: exerciseIds } } });
  if (found !== exerciseIds.length) return { ok: false, error: "Exercício não encontrado no catálogo" };

  if (planId) {
    const existing = await db.workoutPlan.findUnique({ where: { id: planId }, select: { studentId: true } });
    if (!existing || existing.studentId !== studentId) return { ok: false, error: "Plano não encontrado" };
    if (await planHasHistory(planId))
      return { ok: false, error: "O aluno já treinou com este plano. Use “Duplicar” para criar uma nova versão." };
  }

  const id = await db.$transaction(async (tx) => {
    const plan = planId
      ? await tx.workoutPlan.update({ where: { id: planId }, data: { name, notes } })
      : await tx.workoutPlan.create({ data: { name, notes, studentId, trainerId: staff.id, active: false } });
    // Recriar os dias apagaria o histórico de séries; por isso planos com treinos feitos são bloqueados acima.
    await tx.workoutDay.deleteMany({ where: { planId: plan.id } });
    for (const [dIndex, day] of days.entries()) {
      await tx.workoutDay.create({
        data: {
          planId: plan.id,
          name: day.name,
          order: dIndex,
          items: {
            create: day.items.map((it, iIndex) => ({
              exerciseId: it.exerciseId,
              order: iIndex,
              sets: it.sets,
              reps: it.reps,
              loadKg: it.loadKg,
              restSeconds: it.restSeconds,
              targetRir: it.targetRir,
              notes: it.notes || null,
            })),
          },
        },
      });
    }
    return plan.id;
  });

  revalidatePath(`/treinador/alunos/${studentId}`);
  return { ok: true, planId: id };
}

/** Plano com sessões registradas não pode ser reescrito (perderia o histórico). */
async function planHasHistory(planId: string) {
  return (await db.workoutSession.count({ where: { day: { planId } } })) > 0;
}

/** Copia um plano (dias e exercícios) como novo rascunho para o mesmo aluno. */
export async function duplicatePlan(planId: string): Promise<ActionResult & { planId?: string }> {
  const plan = await db.workoutPlan.findUnique({
    where: { id: planId },
    include: { days: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } } },
  });
  if (!plan) return { ok: false, error: "Plano não encontrado" };
  const { staff } = await requireManagedStudent(plan.studentId);
  const copy = await db.workoutPlan.create({
    data: {
      name: `${plan.name} (cópia)`.slice(0, 80),
      notes: plan.notes,
      studentId: plan.studentId,
      trainerId: staff.id,
      active: false,
      days: {
        create: plan.days.map((d) => ({
          name: d.name,
          order: d.order,
          items: {
            create: d.items.map(({ exerciseId, order, sets, reps, loadKg, restSeconds, targetRir, notes }) => ({
              exerciseId, order, sets, reps, loadKg, restSeconds, targetRir, notes,
            })),
          },
        })),
      },
    },
  });
  revalidatePath(`/treinador/alunos/${plan.studentId}`);
  return { ok: true, planId: copy.id };
}

/** Envia o plano ao aluno: vira o único plano ativo dele. */
export async function sendPlan(planId: string): Promise<ActionResult> {
  const plan = await db.workoutPlan.findUnique({ where: { id: planId }, include: { _count: { select: { days: true } } } });
  if (!plan) return { ok: false, error: "Plano não encontrado" };
  await requireManagedStudent(plan.studentId);
  if (plan._count.days === 0) return { ok: false, error: "O plano está vazio" };

  await db.$transaction([
    db.workoutPlan.updateMany({ where: { studentId: plan.studentId, id: { not: planId } }, data: { active: false } }),
    db.workoutPlan.update({ where: { id: planId }, data: { active: true, sentAt: new Date() } }),
  ]);
  revalidatePath(`/treinador/alunos/${plan.studentId}`);
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const plan = await db.workoutPlan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Plano não encontrado" };
  await requireManagedStudent(plan.studentId);
  await db.workoutPlan.delete({ where: { id: planId } });
  revalidatePath(`/treinador/alunos/${plan.studentId}`);
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

// ─── Catálogo ─────────────────────────────────────────────

export async function saveExercise(id: string | null, input: ExerciseInput): Promise<ActionResult & { id?: string }> {
  const staff = await requireStaff();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  if (!MUSCLE_GROUPS.some((m) => m.value === parsed.data.muscleGroup)) return { ok: false, error: "Grupo muscular inválido" };

  try {
    const ex = id
      ? await db.exercise.update({ where: { id }, data: parsed.data })
      : await db.exercise.create({ data: { ...parsed.data, createdById: staff.id } });
    revalidatePath("/treinador/exercicios");
    return { ok: true, id: ex.id };
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2002") return { ok: false, error: "Já existe um exercício com esse nome" };
    throw err;
  }
}

const MAX_IMAGE = 4 * 1024 * 1024;

/** Imagem própria do exercício (substitui a foto de referência na exibição). */
export async function uploadExerciseImage(formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(formData.get("exerciseId") ?? "");
  const file = formData.get("image");
  const exercise = await db.exercise.findUnique({ where: { id } });
  if (!exercise) return { ok: false, error: "Exercício não encontrado" };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecione uma imagem" };
  if (file.size > MAX_IMAGE) return { ok: false, error: "Imagem acima de 4 MB" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isWebp = String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) return { ok: false, error: "Use JPG, PNG ou WEBP" };
  const ext = isJpeg ? "jpg" : isPng ? "png" : "webp";

  const key = `exercises/${id}/${randomUUID()}.${ext}`;
  await putObject(key, bytes, isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp");
  await db.exercise.update({ where: { id }, data: { imageKey: key } });
  if (exercise.imageKey) await deleteObject(exercise.imageKey).catch(() => {});
  revalidatePath("/treinador/exercicios");
  return { ok: true };
}

// ─── Equipe (admin) ───────────────────────────────────────

export async function setUserRole(userId: string, role: Role): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!["STUDENT", "TRAINER", "ADMIN"].includes(role)) return { ok: false, error: "Papel inválido" };
  if (userId === admin.id && role !== "ADMIN") return { ok: false, error: "Você não pode remover o seu próprio acesso de admin" };
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role, ...(role !== "STUDENT" && { trainerId: null }) } });
    // Quem deixa de ser treinador libera os alunos
    if (role === "STUDENT") await tx.user.updateMany({ where: { trainerId: userId }, data: { trainerId: null } });
  });
  revalidatePath("/treinador/equipe");
  return { ok: true };
}

export async function assignTrainer(studentId: string, trainerId: string | null): Promise<ActionResult> {
  await requireAdmin();
  if (trainerId) {
    const t = await db.user.findUnique({ where: { id: trainerId }, select: { role: true } });
    if (!t || t.role === "STUDENT") return { ok: false, error: "Treinador inválido" };
  }
  await db.user.update({ where: { id: studentId }, data: { trainerId } });
  revalidatePath("/treinador/equipe");
  revalidatePath("/treinador");
  return { ok: true };
}
