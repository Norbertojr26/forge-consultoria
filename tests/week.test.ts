import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/metrics";
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
    expect(m.nextCheckIn).toEqual({ weekOf: day("2026-10-11"), dueBy: day("2026-10-17"), pending: true });
  });

  it("calcula peso, delta e aderência com semana atual feita", () => {
    const m = computeMetrics(
      [
        { weekOf: day("2026-09-27"), weightKg: 82 },
        { weekOf: day("2026-10-11"), weightKg: 80.6 },
        { weekOf: day("2026-10-04"), weightKg: 81.2 },
      ],
      now,
    );
    expect(m.currentWeight).toBe(80.6);
    expect(m.weeklyDelta).toBe(-0.6);
    expect(m.adherence).toBe(1);
    expect(m.doneThisWeek).toBe(true);
    expect(m.nextCheckIn).toEqual({ weekOf: day("2026-10-18"), dueBy: day("2026-10-24"), pending: false });
  });

  it("semana atual em aberto não penaliza a aderência", () => {
    const m = computeMetrics(
      [
        { weekOf: day("2026-09-20"), weightKg: 82 },
        { weekOf: day("2026-10-04"), weightKg: 81 },
      ],
      now,
    );
    // semanas 20/09, 27/09, 04/10 → 2 de 3
    expect(m.adherence).toBeCloseTo(2 / 3);
    expect(m.nextCheckIn.pending).toBe(true);
  });
});
