import { describe, expect, it } from "vitest";
import { cardioLogSchema, cardioWeek, formatHours, routineSchema, sleepHours, sleepLogSchema, sleepStats } from "@/lib/routine";

describe("sleepHours / formatHours", () => {
  it("atravessa a meia-noite e arredonda a 15 min", () => {
    expect(sleepHours("23:00", "06:30")).toBe(7.5);
    expect(sleepHours("01:10", "08:00")).toBe(6.75); // 6h50 → 6,75
    expect(sleepHours("22:00", "22:00")).toBe(24);
    expect(formatHours(7.5)).toBe("7h30");
    expect(formatHours(8)).toBe("8h");
  });
});

describe("sleepStats", () => {
  it("calcula médias e noites na meta", () => {
    const s = sleepStats([{ hours: 8, quality: 4 }, { hours: 6, quality: 2 }, { hours: 7.75, quality: 5 }], 8);
    expect(s).toEqual({ nights: 3, avgHours: 7.25, avgQuality: 3.7, onGoal: 2 });
    expect(sleepStats([])).toBeNull();
  });
});

describe("cardioWeek", () => {
  const prescribed = [
    { id: "a", kind: "LISS", durationMin: 30, perWeek: 3 },
    { id: "b", kind: "HIIT", durationMin: 15, perWeek: 1 },
  ];
  it("conta ligados e usa avulsos do mesmo tipo nas vagas que sobram", () => {
    const w = cardioWeek(prescribed, [
      { prescriptionId: "a", kind: "LISS", durationMin: 30 },
      { prescriptionId: null, kind: "LISS", durationMin: 40 },
      { prescriptionId: null, kind: "OUTRO", durationMin: 60 },
    ]);
    expect(w.perPrescription).toEqual([
      { id: "a", done: 2, target: 3 },
      { id: "b", done: 0, target: 1 },
    ]);
    expect(w).toMatchObject({ sessions: 3, targetSessions: 4, minutes: 130, targetMinutes: 105 });
  });
  it("registro de prescrição removida conta como avulso", () => {
    const w = cardioWeek(prescribed, [{ prescriptionId: "velho", kind: "HIIT", durationMin: 20 }]);
    expect(w.perPrescription[1].done).toBe(1);
  });
});

describe("schemas", () => {
  it("valida rotina e normaliza textos vazios", () => {
    const r = routineSchema.parse({
      studentId: "u1",
      sleepGoalHours: "8",
      bedtime: "23:00",
      sleepNotes: "",
      mobilityPerWeek: 3,
      mobilityNotes: null,
      cardio: [{ kind: "Z2", modality: "Bike", durationMin: "40", perWeek: 2, intensity: "", notes: null }],
      mobility: [{ name: "Rotação torácica", prescription: "2×10", notes: "" }],
    });
    expect(r.sleepGoalHours).toBe(8);
    expect(r.sleepNotes).toBeNull();
    expect(r.cardio[0].intensity).toBeNull();
    expect(routineSchema.safeParse({ ...r, bedtime: "25:00" }).success).toBe(false);
  });
  it("valida registros de cardio e sono", () => {
    const log = cardioLogSchema.parse({ prescriptionId: null, kind: "LISS", modality: "Esteira", durationMin: "30", distanceKm: null, avgHr: null, rpe: 5, notes: null });
    expect(log.daysAgo).toBe(0);
    expect(log.distanceKm).toBeNull(); // vazio não vira 0 km
    expect(cardioLogSchema.safeParse({ prescriptionId: null, kind: "X", modality: "a", durationMin: 1, distanceKm: null, avgHr: null, rpe: null, notes: null }).success).toBe(false);
    expect(sleepLogSchema.safeParse({ bedtime: "23:00", wakeTime: "7:00", quality: 3, notes: null }).success).toBe(false);
    expect(sleepLogSchema.parse({ bedtime: "23:00", wakeTime: "07:00", quality: 3, notes: null, daysAgo: 1 }).daysAgo).toBe(1);
  });
});
