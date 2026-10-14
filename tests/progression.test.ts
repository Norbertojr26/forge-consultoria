import { describe, expect, it } from "vitest";
import { bestSet, estimate1RM, parseRepRange, suggestNext } from "@/lib/progression";

describe("parseRepRange", () => {
  it("lê faixas e números únicos; ignora tempo e falha", () => {
    expect(parseRepRange("8-12")).toEqual({ min: 8, max: 12 });
    expect(parseRepRange("10")).toEqual({ min: 10, max: 10 });
    expect(parseRepRange("20 min")).toBeNull();
    expect(parseRepRange("até a falha")).toBeNull();
  });
});

describe("estimate1RM / bestSet", () => {
  it("Epley e melhor série", () => {
    expect(estimate1RM(100, 5)).toBe(116.7);
    expect(estimate1RM(100, 15)).toBeNull();
    expect(bestSet([{ reps: 10, loadKg: 60, rir: 2 }, { reps: 6, loadKg: 70, rir: 1 }])?.loadKg).toBe(70);
  });
});

describe("suggestNext", () => {
  it("sem histórico → sem sugestão", () => {
    expect(suggestNext([], "8-12", 2)).toBeNull();
  });
  it("todas no topo com fôlego → sobe 2,5 kg", () => {
    const s = suggestNext([{ reps: 12, loadKg: 60, rir: 2 }, { reps: 12, loadKg: 60, rir: 2 }], "8-12", 2);
    expect(s).toMatchObject({ loadKg: 62.5, reps: 8 });
  });
  it("carga leve sobe 1 kg", () => {
    expect(suggestNext([{ reps: 15, loadKg: 12, rir: 3 }], "12-15", 2)?.loadKg).toBe(13);
  });
  it("passou do alvo (RIR menor) → mantém", () => {
    expect(suggestNext([{ reps: 12, loadKg: 60, rir: 0 }], "8-12", 2)).toMatchObject({ loadKg: 60 });
  });
  it("abaixo do mínimo → mantém e busca a faixa", () => {
    expect(suggestNext([{ reps: 6, loadKg: 60, rir: 1 }], "8-12", null)?.text).toContain("8–12");
  });
  it("no meio da faixa → +1 rep com a mesma carga", () => {
    expect(suggestNext([{ reps: 10, loadKg: 60, rir: 2 }, { reps: 9, loadKg: 60, rir: 1 }], "8-12", 1)).toMatchObject({ loadKg: 60, reps: 11 });
  });
});
