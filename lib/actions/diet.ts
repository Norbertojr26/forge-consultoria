"use server";

import { revalidatePath } from "next/cache";
import { requireManagedStudent, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { type DietInput, dietSchema, todaySP } from "@/lib/diet";
import type { ActionResult } from "@/lib/validations";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Dados inválidos";

// ─── Treinador ────────────────────────────────────────────

/**
 * Cria ou substitui a dieta inteira (refeições e suplementos). Diferente do treino, pode ser
 * editada depois de enviada: as marcações antigas do aluno só deixam de casar com itens removidos.
 */
export async function saveDiet(input: DietInput): Promise<ActionResult & { planId?: string }> {
  const parsed = dietSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { planId, studentId, meals, supplements, ...fields } = parsed.data;
  const { staff } = await requireManagedStudent(studentId);
  if (meals.length === 0 && supplements.length === 0) return { ok: false, error: "Adicione ao menos uma refeição ou suplemento" };

  if (planId) {
    const existing = await db.dietPlan.findUnique({ where: { id: planId }, select: { studentId: true } });
    if (!existing || existing.studentId !== studentId) return { ok: false, error: "Dieta não encontrada" };
  }

  // Alimentos do banco removidos no meio do caminho viram texto livre
  const foodIds = [...new Set(meals.flatMap((m) => m.items.map((i) => i.foodId).filter((x): x is string => !!x)))];
  const existingFoods = new Set((await db.food.findMany({ where: { id: { in: foodIds } }, select: { id: true } })).map((f) => f.id));

  const id = await db.$transaction(async (tx) => {
    const plan = planId
      ? await tx.dietPlan.update({ where: { id: planId }, data: fields })
      : await tx.dietPlan.create({ data: { ...fields, studentId, trainerId: staff.id } });
    // Prato já gerado continua valendo se a refeição mantiver nome e posição
    const oldMeals = await tx.meal.findMany({ where: { planId: plan.id }, select: { order: true, name: true, imageKey: true } });
    await tx.meal.deleteMany({ where: { planId: plan.id } });
    await tx.supplement.deleteMany({ where: { planId: plan.id } });
    for (const [order, meal] of meals.entries()) {
      const kept = oldMeals.find((m) => m.order === order && m.name === meal.name)?.imageKey ?? null;
      await tx.meal.create({
        data: {
          planId: plan.id,
          order,
          name: meal.name,
          time: meal.time,
          notes: meal.notes || null,
          imageKey: kept,
          items: {
            create: meal.items.map((it, i) => ({
              ...it,
              order: i,
              substitutions: it.substitutions || null,
              foodId: it.foodId && existingFoods.has(it.foodId) ? it.foodId : null,
              grams: it.grams ?? null,
            })),
          },
        },
      });
    }
    if (supplements.length) {
      await tx.supplement.createMany({
        data: supplements.map((s, order) => ({ ...s, order, planId: plan.id, notes: s.notes || null, times: [...new Set(s.times)].sort() })),
      });
    }
    return plan.id;
  });

  revalidatePath(`/treinador/alunos/${studentId}`);
  revalidatePath("/aluno", "layout");
  return { ok: true, planId: id };
}

/** Envia a dieta: vira a única ativa do aluno. */
export async function sendDiet(planId: string): Promise<ActionResult> {
  const plan = await db.dietPlan.findUnique({ where: { id: planId }, include: { _count: { select: { meals: true, supplements: true } } } });
  if (!plan) return { ok: false, error: "Dieta não encontrada" };
  await requireManagedStudent(plan.studentId);
  if (plan._count.meals + plan._count.supplements === 0) return { ok: false, error: "A dieta está vazia" };
  await db.$transaction([
    db.dietPlan.updateMany({ where: { studentId: plan.studentId, id: { not: planId } }, data: { active: false } }),
    db.dietPlan.update({ where: { id: planId }, data: { active: true, sentAt: new Date() } }),
  ]);
  revalidatePath(`/treinador/alunos/${plan.studentId}`);
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

export async function duplicateDiet(planId: string): Promise<ActionResult & { planId?: string }> {
  const plan = await db.dietPlan.findUnique({
    where: { id: planId },
    include: { meals: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } }, supplements: { orderBy: { order: "asc" } } },
  });
  if (!plan) return { ok: false, error: "Dieta não encontrada" };
  const { staff } = await requireManagedStudent(plan.studentId);
  const copy = await db.dietPlan.create({
    data: {
      name: `${plan.name} (cópia)`.slice(0, 80),
      notes: plan.notes,
      kcalTarget: plan.kcalTarget,
      proteinG: plan.proteinG,
      carbsG: plan.carbsG,
      fatG: plan.fatG,
      waterGoalMl: plan.waterGoalMl,
      studentId: plan.studentId,
      trainerId: staff.id,
      meals: {
        create: plan.meals.map((m) => ({
          name: m.name,
          time: m.time,
          order: m.order,
          notes: m.notes,
          // a imagem fica com a original (apagar uma não pode quebrar a outra)
          items: {
            create: m.items.map(({ order, food, quantity, kcal, proteinG, carbsG, fatG, substitutions, foodId, grams }) => ({
              order, food, quantity, kcal, proteinG, carbsG, fatG, substitutions, foodId, grams,
            })),
          },
        })),
      },
      supplements: { create: plan.supplements.map(({ kind, name, dose, times, notes, order }) => ({ kind, name, dose, times, notes, order })) },
    },
  });
  revalidatePath(`/treinador/alunos/${plan.studentId}`);
  return { ok: true, planId: copy.id };
}

export async function deleteDiet(planId: string): Promise<ActionResult> {
  const plan = await db.dietPlan.findUnique({ where: { id: planId } });
  if (!plan) return { ok: false, error: "Dieta não encontrada" };
  await requireManagedStudent(plan.studentId);
  await db.dietPlan.delete({ where: { id: planId } });
  revalidatePath(`/treinador/alunos/${plan.studentId}`);
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

// ─── Aluno ────────────────────────────────────────────────

/** Registra um copo/garrafa de água no dia de hoje. */
export async function addWater(amountMl: number): Promise<ActionResult> {
  const user = await requireUser();
  if (!Number.isInteger(amountMl) || amountMl < 50 || amountMl > 2000) return { ok: false, error: "Quantidade inválida" };
  await db.waterLog.create({ data: { userId: user.id, date: todaySP(), amountMl } });
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

/** Desfaz o último registro de água de hoje. */
export async function undoWater(): Promise<ActionResult> {
  const user = await requireUser();
  const last = await db.waterLog.findFirst({ where: { userId: user.id, date: todaySP() }, orderBy: { createdAt: "desc" } });
  if (last) await db.waterLog.delete({ where: { id: last.id } });
  revalidatePath("/aluno", "layout");
  return { ok: true };
}

/** Marca/desmarca refeição feita ou dose tomada hoje. Só vale para itens da dieta ativa do aluno. */
export async function toggleCheck(kind: "MEAL" | "SUPPLEMENT", refId: string, slot = ""): Promise<ActionResult> {
  const user = await requireUser();
  const plan = { studentId: user.id, active: true, sentAt: { not: null } };
  const valid =
    kind === "MEAL"
      ? !!(await db.meal.findFirst({ where: { id: refId, plan }, select: { id: true } })) && slot === ""
      : kind === "SUPPLEMENT"
        ? (await db.supplement.findFirst({ where: { id: refId, plan }, select: { times: true } }))?.times.includes(slot) ?? false
        : false;
  if (!valid) return { ok: false, error: "Item não encontrado na sua dieta" };

  const key = { userId: user.id, date: todaySP(), kind, refId, slot };
  const existing = await db.dailyCheck.findUnique({ where: { userId_date_kind_refId_slot: key } });
  if (existing) await db.dailyCheck.delete({ where: { id: existing.id } });
  else await db.dailyCheck.create({ data: key }).catch(() => {}); // clique duplo: já existe
  revalidatePath("/aluno", "layout");
  return { ok: true };
}
