import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { commonTags, scaleMacros, templateContentSchema } from "@/lib/foods";

describe("scaleMacros", () => {
  it("escala valores por 100 g para a porção", () => {
    // Arroz integral cozido (TACO): 124 kcal, P 2.6, C 25.8, G 1.0 por 100 g
    expect(scaleMacros({ kcal: 124, proteinG: 2.6, carbsG: 25.8, fatG: 1 }, 150)).toEqual({ kcal: 186, proteinG: 3.9, carbsG: 38.7, fatG: 1.5 });
    expect(scaleMacros({ kcal: 124, proteinG: 2.6, carbsG: 25.8, fatG: 1 }, 0)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe("commonTags", () => {
  it("só mantém as etiquetas que todos os alimentos têm", () => {
    expect(commonTags([["sem_lactose", "vegano"], ["sem_lactose", "sem_gluten"]])).toEqual(["sem_lactose"]);
    expect(commonTags([])).toEqual([]);
  });
});

describe("kits de exemplo da migration", () => {
  const sql = readFileSync("prisma/migrations/20261014200000_banco_alimentos/migration.sql", "utf8");
  const contents = [...sql.matchAll(/'(\{"notes".*?)'::jsonb/g)].map((m) => JSON.parse(m[1].replaceAll("''", "'")));

  it("tem os 4 kits e todos validam no schema do app", () => {
    expect(contents).toHaveLength(4);
    for (const c of contents) expect(templateContentSchema.safeParse(c).success).toBe(true);
  });

  it("itens dos kits apontam para alimentos importados", () => {
    const ids = new Set([...sql.matchAll(/\('(taco_\d{3})', \d+,/g)].map((m) => m[1]));
    expect(ids.size).toBeGreaterThan(500);
    for (const c of contents) for (const meal of c.meals) for (const it of meal.items) expect(ids.has(it.foodId)).toBe(true);
  });
});
