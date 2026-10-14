import { z } from "zod";
import { dietSchema } from "@/lib/diet";

/** Etiquetas de restrição dos alimentos e dos kits. */
export const FOOD_TAGS = [
  { value: "sem_lactose", label: "Zero lactose" },
  { value: "sem_gluten", label: "Zero glúten" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
] as const;
export type FoodTag = (typeof FOOD_TAGS)[number]["value"];
export const tagLabel = (t: string) => FOOD_TAGS.find((x) => x.value === t)?.label ?? t;

export type FoodMacros = { kcal: number; proteinG: number; carbsG: number; fatG: number };

/** Macros de `grams` g de um alimento cujos valores são por 100 g (arredondados como no rótulo). */
export function scaleMacros(per100: FoodMacros, grams: number) {
  const f = grams / 100;
  const r1 = (n: number) => Math.round(n * f * 10) / 10;
  return { kcal: Math.round(per100.kcal * f), proteinG: r1(per100.proteinG), carbsG: r1(per100.carbsG), fatG: r1(per100.fatG) };
}

/** Um kit só pode ter as etiquetas que todos os alimentos do banco nele têm. */
export function commonTags(foodTags: string[][]): FoodTag[] {
  if (foodTags.length === 0) return [];
  return FOOD_TAGS.map((t) => t.value).filter((t) => foodTags.every((tags) => tags.includes(t)));
}

const optNum = (max: number) => z.union([z.coerce.number().min(0).max(max), z.null()]);

export const foodSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(100),
  category: z.string().trim().min(2).max(60),
  kcal: z.coerce.number().min(0).max(1000),
  proteinG: z.coerce.number().min(0).max(100),
  carbsG: z.coerce.number().min(0).max(100),
  fatG: z.coerce.number().min(0).max(100),
  fiberG: optNum(100),
  unitName: z.string().trim().max(30).nullable(),
  unitGrams: optNum(2000),
  tags: z.array(z.enum(["sem_lactose", "sem_gluten", "vegetariano", "vegano"])),
});
export type FoodInput = z.infer<typeof foodSchema>;

/** Conteúdo de um kit: o mesmo de uma dieta, sem aluno nem identificação. */
export const templateContentSchema = dietSchema.omit({ planId: true, studentId: true, name: true });
export type TemplateContent = z.infer<typeof templateContentSchema>;

export const templateSchema = z.object({
  id: z.string().nullable(),
  name: z.string().trim().min(2, "Dê um nome ao kit").max(80),
  description: z.string().trim().max(500).nullable(),
  tags: z.array(z.enum(["sem_lactose", "sem_gluten", "vegetariano", "vegano"])),
  content: templateContentSchema,
});
export type TemplateInput = z.infer<typeof templateSchema>;
