import { addDaysUtc, weekOf, weeksBetween } from "@/lib/week";

type CheckInLike = { weekOf: Date; weightKg: number };

export type DashboardMetrics = {
  currentWeight: number | null;
  /** Diferença para o check-in anterior (kg). */
  weeklyDelta: number | null;
  /** Fração 0–1 de semanas com check-in desde o primeiro. */
  adherence: number | null;
  doneThisWeek: boolean;
  /** Domingo da próxima semana de check-in pendente. */
  nextCheckIn: { weekOf: Date; dueBy: Date; pending: boolean };
};

/** `checkIns` em qualquer ordem. */
export function computeMetrics(checkIns: CheckInLike[], now: Date = new Date()): DashboardMetrics {
  const current = weekOf(now);
  const sorted = [...checkIns]
    .filter((c) => c.weekOf.getTime() <= current.getTime())
    .sort((a, b) => a.weekOf.getTime() - b.weekOf.getTime());

  const latest = sorted.at(-1);
  const previous = sorted.at(-2);
  const doneThisWeek = latest?.weekOf.getTime() === current.getTime();

  let adherence: number | null = null;
  if (sorted.length > 0) {
    // A semana atual só conta no denominador quando já tem check-in (ainda está aberta).
    const lastWeek = doneThisWeek ? current : addDaysUtc(current, -7);
    const totalWeeks = weeksBetween(sorted[0].weekOf, lastWeek) + 1;
    adherence = totalWeeks > 0 ? Math.min(1, sorted.length / totalWeeks) : null;
  }

  const nextWeek = doneThisWeek ? addDaysUtc(current, 7) : current;

  return {
    currentWeight: latest?.weightKg ?? null,
    weeklyDelta: latest && previous ? round1(latest.weightKg - previous.weightKg) : null,
    adherence,
    doneThisWeek,
    nextCheckIn: {
      weekOf: nextWeek,
      dueBy: addDaysUtc(nextWeek, 6),
      pending: !doneThisWeek,
    },
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
