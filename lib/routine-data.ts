import "server-only";
import { db } from "@/lib/db";
import { cardioWeek, sleepStats } from "@/lib/routine";
import { addDaysUtc, todaySP, weekOf } from "@/lib/week";

/**
 * Rotina do aluno e o que ele fez: semana corrente (cardio e mobilidade) e últimas
 * `nights` noites de sono. Serve à área do aluno e ao painel do treinador.
 */
export async function getRoutineOverview(userId: string, { nights = 14 }: { nights?: number } = {}) {
  const today = todaySP();
  const week = weekOf();
  const since = addDaysUtc(today, -(nights - 1));

  const [routine, weekCardio, sleep, mobilityChecks, todaySleep] = await Promise.all([
    db.routine.findUnique({
      where: { studentId: userId },
      include: { cardio: { orderBy: { order: "asc" } }, mobility: { orderBy: { order: "asc" } } },
    }),
    db.cardioLog.findMany({ where: { userId, date: { gte: week } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    db.sleepLog.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: "asc" } }),
    db.dailyCheck.findMany({ where: { userId, kind: "MOBILITY", date: { gte: week } }, select: { date: true } }),
    db.sleepLog.findUnique({ where: { userId_date: { userId, date: today } } }),
  ]);

  const mobilityDays = new Set(mobilityChecks.map((c) => c.date.getTime()));
  // Série de noites com buracos (null) para o gráfico
  const sleepSeries = Array.from({ length: nights }, (_, i) => {
    const date = addDaysUtc(since, i);
    return { date, log: sleep.find((s) => s.date.getTime() === date.getTime()) ?? null };
  });
  const last7 = sleep.filter((s) => s.date >= addDaysUtc(today, -6));

  return {
    routine,
    today,
    cardio: { logs: weekCardio, week: cardioWeek(routine?.cardio ?? [], weekCardio) },
    sleep: { series: sleepSeries, today: todaySleep, stats7: sleepStats(last7, routine?.sleepGoalHours) },
    mobility: { doneToday: mobilityDays.has(today.getTime()), daysThisWeek: mobilityDays.size, target: routine?.mobilityPerWeek ?? null },
  };
}
export type RoutineOverview = Awaited<ReturnType<typeof getRoutineOverview>>;

/** Minutos de cardio por semana (últimas `weeks` semanas, mais antiga primeiro). */
export async function cardioMinutesByWeek(userId: string, weeks = 6) {
  const current = weekOf();
  const start = addDaysUtc(current, -7 * (weeks - 1));
  const logs = await db.cardioLog.findMany({ where: { userId, date: { gte: start } }, select: { date: true, durationMin: true } });
  return Array.from({ length: weeks }, (_, i) => {
    const from = addDaysUtc(start, 7 * i);
    const to = addDaysUtc(from, 7);
    const minutes = logs.filter((l) => l.date >= from && l.date < to).reduce((s, l) => s + l.durationMin, 0);
    return { weekOf: from, minutes };
  });
}
