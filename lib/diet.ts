import { TZDate } from "@date-fns/tz";
import { z } from "zod";
import { TIMEZONE, todaySP } from "@/lib/week";

export { todaySP };

/** Hora atual em São Paulo como "HH:MM" (para destacar a próxima refeição/dose). */
export function nowHHMM(now: Date = new Date()): string {
  const d = new TZDate(now, TIMEZONE);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const DEFAULT_WATER_ML = 2500;

/** Meta de água: a do plano; senão 35 ml por kg do último peso; senão 2,5 L. Arredondada a 50 ml. */
export function waterGoalMl(planGoal: number | null | undefined, weightKg: number | null | undefined): number {
  if (planGoal) return planGoal;
  if (weightKg) return Math.round((weightKg * 35) / 50) * 50;
  return DEFAULT_WATER_ML;
}

export const formatLiters = (ml: number) =>
  `${(ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L`;

type Macros = { kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null };

/** Soma kcal e macros dos itens (campos vazios contam como 0). */
export function sumMacros(items: Macros[]) {
  return items.reduce<{ kcal: number; proteinG: number; carbsG: number; fatG: number }>(
    (acc, it) => ({
      kcal: acc.kcal + (it.kcal ?? 0),
      proteinG: acc.proteinG + (it.proteinG ?? 0),
      carbsG: acc.carbsG + (it.carbsG ?? 0),
      fatG: acc.fatG + (it.fatG ?? 0),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const optNum = (max: number) => z.union([z.coerce.number().min(0).max(max), z.null()]);
const optInt = (max: number) => z.union([z.coerce.number().int().min(0).max(max), z.null()]);

export const mealItemSchema = z.object({
  food: z.string().trim().min(1, "Informe o alimento").max(80),
  quantity: z.string().trim().min(1, "Informe a quantidade").max(40),
  kcal: optInt(5000),
  proteinG: optNum(500),
  carbsG: optNum(1000),
  fatG: optNum(500),
  substitutions: z.string().trim().max(200).nullable(),
});

export const supplementSchema = z.object({
  kind: z.enum(["SUPPLEMENT", "MEDICATION"]),
  name: z.string().trim().min(1, "Informe o nome do suplemento").max(80),
  dose: z.string().trim().min(1, "Informe a dose").max(40),
  times: z.array(z.string().regex(HHMM, "Horário inválido (use HH:MM)")).min(1, "Cada suplemento precisa de ao menos um horário").max(6),
  notes: z.string().trim().max(200).nullable(),
});

export const dietSchema = z.object({
  planId: z.string().nullable(),
  studentId: z.string().min(1),
  name: z.string().trim().min(2, "Dê um nome à dieta").max(80),
  notes: z.string().trim().max(1500).nullable(),
  kcalTarget: optInt(10000),
  proteinG: optInt(1000),
  carbsG: optInt(2000),
  fatG: optInt(1000),
  waterGoalMl: z.union([z.coerce.number().int().min(500, "Meta de água mínima: 500 ml").max(10000), z.null()]),
  meals: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Dê um nome a cada refeição").max(60),
        time: z.union([z.string().regex(HHMM, "Horário inválido (use HH:MM)"), z.null()]),
        notes: z.string().trim().max(300).nullable(),
        items: z.array(mealItemSchema).min(1, "Cada refeição precisa de ao menos 1 alimento").max(30),
      }),
    )
    .max(12),
  supplements: z.array(supplementSchema).max(30),
});
export type DietInput = z.infer<typeof dietSchema>;
