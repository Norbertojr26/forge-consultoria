import { addDaysUtc, todaySP, weekOf, weeksBetween } from "@/lib/week";

type CheckInLike = { weekOf: Date; date: Date; weightKg: number };

/** Frequências de check-in que o treinador pode escolher. */
export const CHECKIN_FREQUENCIES = [
  { days: 7, label: "Semanal" },
  { days: 10, label: "A cada 10 dias" },
  { days: 14, label: "Quinzenal" },
] as const;
export const frequencyLabel = (days: number) => CHECKIN_FREQUENCIES.find((f) => f.days === days)?.label ?? `A cada ${days} dias`;

/** Dias de tolerância depois da data prevista (frequências de 10/14 dias). */
export const CHECKIN_GRACE_DAYS = 2;

export type DashboardMetrics = {
  currentWeight: number | null;
  /** Diferença para o check-in anterior (kg). */
  weeklyDelta: number | null;
  /** Fração 0–1 de check-ins feitos sobre os esperados desde o primeiro. */
  adherence: number | null;
  /** Já há check-in no ciclo atual (semana, ou janela de N dias). */
  doneThisCycle: boolean;
  /**
   * Próximo check-in. Semanal: de domingo (opensOn) a sábado (dueBy).
   * 10/14 dias: abre N dias após o último (opensOn) e vence com a tolerância (dueBy).
   */
  nextCheckIn: { opensOn: Date; dueBy: Date; pending: boolean; overdue: boolean };
};

const byDate = (a: CheckInLike, b: CheckInLike) => a.date.getTime() - b.date.getTime();
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

/** `checkIns` em qualquer ordem. `everyDays` = frequência do aluno (7, 10 ou 14). */
export function computeMetrics(checkIns: CheckInLike[], now: Date = new Date(), everyDays = 7): DashboardMetrics {
  const today = todaySP(now);
  const sorted = [...checkIns].filter((c) => c.date.getTime() <= today.getTime()).sort(byDate);
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);
  const base = {
    currentWeight: latest?.weightKg ?? null,
    weeklyDelta: latest && previous ? round1(latest.weightKg - previous.weightKg) : null,
  };

  if (everyDays === 7) {
    // Semanal: uma janela por semana (domingo a sábado em São Paulo)
    const current = weekOf(now);
    const doneThisCycle = latest?.weekOf.getTime() === current.getTime();
    let adherence: number | null = null;
    if (sorted.length > 0) {
      // A semana atual só conta no denominador quando já tem check-in (ainda está aberta).
      const lastWeek = doneThisCycle ? current : addDaysUtc(current, -7);
      const weeks = new Set(sorted.map((c) => c.weekOf.getTime())).size;
      const totalWeeks = weeksBetween(sorted[0].weekOf, lastWeek) + 1;
      adherence = totalWeeks > 0 ? Math.min(1, weeks / totalWeeks) : null;
    }
    const opensOn = doneThisCycle ? addDaysUtc(current, 7) : current;
    return { ...base, adherence, doneThisCycle, nextCheckIn: { opensOn, dueBy: addDaysUtc(opensOn, 6), pending: !doneThisCycle, overdue: false } };
  }

  // 10/14 dias: o próximo abre N dias depois do último
  const opensOn = latest ? addDaysUtc(latest.date, everyDays) : today;
  const pending = today.getTime() >= opensOn.getTime();
  const dueBy = addDaysUtc(opensOn, CHECKIN_GRACE_DAYS);
  let adherence: number | null = null;
  if (sorted.length > 0) {
    // Esperados: o primeiro + um a cada N dias, contando só ciclos cuja tolerância já venceu
    const expected = 1 + Math.max(0, Math.floor((daysBetween(sorted[0].date, today) - CHECKIN_GRACE_DAYS) / everyDays));
    adherence = Math.min(1, sorted.length / expected);
  }
  return {
    ...base,
    adherence,
    doneThisCycle: !pending,
    nextCheckIn: { opensOn, dueBy, pending, overdue: pending && today.getTime() > dueBy.getTime() },
  };
}

/**
 * Check-in que o formulário edita agora: o do ciclo atual, se existir.
 * Fora disso, o envio cria um novo.
 */
export function currentCycleCheckIn<T extends CheckInLike>(checkIns: T[], now: Date = new Date(), everyDays = 7): T | null {
  const sorted = [...checkIns].sort(byDate);
  const latest = sorted.at(-1);
  if (!latest) return null;
  if (everyDays === 7) return latest.weekOf.getTime() === weekOf(now).getTime() ? latest : null;
  return todaySP(now).getTime() < addDaysUtc(latest.date, everyDays).getTime() ? latest : null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
