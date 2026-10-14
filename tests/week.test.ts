import { describe, expect, it } from "vitest";
import { computeMetrics, currentCycleCheckIn } from "@/lib/metrics";
import { weekOf } from "@/lib/week";

const d = (s: string) => new Date(s);
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("weekOf", () => {
  it("retorna o domingo da semana em São Paulo", () => {
    // Quarta, 15/10/2026 às 12h em SP
    expect(weekOf(d("2026-10-15T15:00:00Z"))).toEqual(day("2026-10-11"));
  });

  it("domingo 22h em SP ainda é a mesma semana (já é segunda em UTC)", () => {
    // Domingo 18/10 22:00 em SP = segunda 19/10 01:00 UTC
    expect(weekOf(d("2026-10-19T01:00:00Z"))).toEqual(day("2026-10-18"));
  });

  it("sábado 23h em SP pertence à semana que começou no domingo anterior", () => {
    // Sábado 17/10 23:00 em SP = domingo 18/10 02:00 UTC
    expect(weekOf(d("2026-10-18T02:00:00Z"))).toEqual(day("2026-10-11"));
  });
});

describe("computeMetrics", () => {
  const now = d("2026-10-15T15:00:00Z"); // semana de 11/10

  it("sem check-ins", () => {
    const m = computeMetrics([], now);
    expect(m.currentWeight).toBeNull();
    expect(m.weeklyDelta).toBeNull();
    expect(m.adherence).toBeNull();
    expect(m.nextCheckIn).toEqual({ opensOn: day("2026-10-11"), dueBy: day("2026-10-17"), pending: true, overdue: false });
  });

  it("calcula peso, delta e aderência com semana atual feita", () => {
    const m = computeMetrics(
      [
        { weekOf: day("2026-09-27"), date: day("2026-09-29"), weightKg: 82 },
        { weekOf: day("2026-10-11"), date: day("2026-10-13"), weightKg: 80.6 },
        { weekOf: day("2026-10-04"), date: day("2026-10-06"), weightKg: 81.2 },
      ],
      now,
    );
    expect(m.currentWeight).toBe(80.6);
    expect(m.weeklyDelta).toBe(-0.6);
    expect(m.adherence).toBe(1);
    expect(m.doneThisCycle).toBe(true);
    expect(m.nextCheckIn).toEqual({ opensOn: day("2026-10-18"), dueBy: day("2026-10-24"), pending: false, overdue: false });
  });

  it("semana atual em aberto não penaliza a aderência", () => {
    const m = computeMetrics(
      [
        { weekOf: day("2026-09-20"), date: day("2026-09-22"), weightKg: 82 },
        { weekOf: day("2026-10-04"), date: day("2026-10-06"), weightKg: 81 },
      ],
      now,
    );
    // semanas 20/09, 27/09, 04/10 → 2 de 3
    expect(m.adherence).toBeCloseTo(2 / 3);
    expect(m.nextCheckIn.pending).toBe(true);
  });
});

describe("frequência de 10/14 dias", () => {
  const now = d("2026-10-15T15:00:00Z"); // quinta 15/10 em SP
  const ci = (date: string, weightKg = 80) => ({ weekOf: weekOf(day(date)), date: day(date), weightKg });

  it("quinzenal: feito há 5 dias → em dia, próximo abre em 9 dias", () => {
    const m = computeMetrics([ci("2026-10-10")], now, 14);
    expect(m.doneThisCycle).toBe(true);
    expect(m.nextCheckIn).toEqual({ opensOn: day("2026-10-24"), dueBy: day("2026-10-26"), pending: false, overdue: false });
    expect(currentCycleCheckIn([ci("2026-10-10")], now, 14)?.date).toEqual(day("2026-10-10"));
  });

  it("10 dias: aberto no dia previsto e atrasado depois da tolerância", () => {
    expect(computeMetrics([ci("2026-10-05")], now, 10).nextCheckIn).toMatchObject({ opensOn: day("2026-10-15"), pending: true, overdue: false });
    expect(computeMetrics([ci("2026-10-01")], now, 10).nextCheckIn).toMatchObject({ pending: true, overdue: true });
    expect(currentCycleCheckIn([ci("2026-10-05")], now, 10)).toBeNull();
  });

  it("aderência conta só ciclos vencidos", () => {
    // primeiro 01/09; até 15/10 (44 dias − 2 de tolerância) → 1 + 4 = 5 esperados
    const m = computeMetrics([ci("2026-09-01"), ci("2026-09-11"), ci("2026-09-21"), ci("2026-10-01")], now, 10);
    expect(m.adherence).toBeCloseTo(4 / 5);
  });
});
