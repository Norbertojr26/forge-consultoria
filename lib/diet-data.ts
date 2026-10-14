import "server-only";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { todaySP, waterGoalMl } from "@/lib/diet";

/** Tudo que o aluno precisa para o dia: dieta ativa, água bebida e marcações de hoje. */
export async function getTodayDiet(user: Pick<User, "id">) {
  const today = todaySP();
  const [plan, water, checks, lastCheckIn] = await Promise.all([
    db.dietPlan.findFirst({
      where: { studentId: user.id, active: true, sentAt: { not: null } },
      include: {
        trainer: { select: { name: true } },
        meals: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
        supplements: { orderBy: { order: "asc" } },
      },
    }),
    db.waterLog.aggregate({ where: { userId: user.id, date: today }, _sum: { amountMl: true }, _count: true }),
    db.dailyCheck.findMany({ where: { userId: user.id, date: today }, select: { kind: true, refId: true, slot: true } }),
    db.checkIn.findFirst({ where: { userId: user.id }, orderBy: { weekOf: "desc" }, select: { weightKg: true } }),
  ]);

  const mealDone = new Set(checks.filter((c) => c.kind === "MEAL").map((c) => c.refId));
  const doseDone = new Set(checks.filter((c) => c.kind === "SUPPLEMENT").map((c) => `${c.refId}@${c.slot}`));
  const doses = (plan?.supplements ?? []).flatMap((s) => s.times.map((t) => ({ supplement: s, time: t, done: doseDone.has(`${s.id}@${t}`) })));

  return {
    plan,
    water: { ml: water._sum.amountMl ?? 0, entries: water._count, goal: waterGoalMl(plan?.waterGoalMl, lastCheckIn?.weightKg) },
    meals: (plan?.meals ?? []).map((m) => ({ ...m, done: mealDone.has(m.id) })),
    doses: doses.sort((a, b) => a.time.localeCompare(b.time)),
  };
}
export type TodayDiet = Awaited<ReturnType<typeof getTodayDiet>>;
