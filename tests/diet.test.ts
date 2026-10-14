import { describe, expect, it } from "vitest";
import { dietSchema, nowHHMM, sumMacros, todaySP, waterGoalMl } from "@/lib/diet";

describe("todaySP / nowHHMM", () => {
  it("usa o fuso de São Paulo (01:30 UTC ainda é o dia anterior)", () => {
    const d = todaySP(new Date("2026-10-15T01:30:00Z"));
    expect(d.toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(nowHHMM(new Date("2026-10-15T01:30:00Z"))).toBe("22:30");
  });
});

describe("waterGoalMl", () => {
  it("prioriza a meta do plano, depois 35 ml/kg, depois o padrão", () => {
    expect(waterGoalMl(3000, 80)).toBe(3000);
    expect(waterGoalMl(null, 82.4)).toBe(2900); // 2884 → 2900
    expect(waterGoalMl(null, null)).toBe(2500);
  });
});

describe("sumMacros", () => {
  it("soma tratando vazio como zero", () => {
    expect(sumMacros([
      { kcal: 200, proteinG: 30, carbsG: null, fatG: 5 },
      { kcal: null, proteinG: 2.5, carbsG: 40, fatG: null },
    ])).toEqual({ kcal: 200, proteinG: 32.5, carbsG: 40, fatG: 5 });
  });
});

describe("dietSchema", () => {
  const base = { planId: null, studentId: "s", name: "Cutting", notes: null, kcalTarget: 2200, proteinG: 180, carbsG: null, fatG: null, waterGoalMl: null };
  it("aceita refeições e suplementos válidos", () => {
    const r = dietSchema.safeParse({
      ...base,
      meals: [{ name: "Almoço", time: "12:30", notes: null, items: [{ food: "Arroz", quantity: "150 g", kcal: 190, proteinG: 4, carbsG: 42, fatG: 0.4, substitutions: null }] }],
      supplements: [{ kind: "SUPPLEMENT", name: "Creatina", dose: "5 g", times: ["08:00"], notes: null }],
    });
    expect(r.success).toBe(true);
  });
  it("rejeita horário inválido e suplemento sem horário", () => {
    expect(dietSchema.safeParse({ ...base, meals: [{ name: "X", time: "25:00", notes: null, items: [{ food: "a", quantity: "1", kcal: null, proteinG: null, carbsG: null, fatG: null, substitutions: null }] }], supplements: [] }).success).toBe(false);
    expect(dietSchema.safeParse({ ...base, meals: [], supplements: [{ kind: "SUPPLEMENT", name: "Whey", dose: "30 g", times: [], notes: null }] }).success).toBe(false);
  });
});
