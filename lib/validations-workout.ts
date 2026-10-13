import { z } from "zod";

export const planItemSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.coerce.number().int().min(1, "Mínimo 1 série").max(20),
  reps: z.string().trim().min(1, "Informe as repetições").max(30),
  loadKg: z.union([z.coerce.number().min(0).max(1000), z.null()]),
  restSeconds: z.coerce.number().int().min(0).max(900),
  notes: z.string().trim().max(300).nullable(),
});

export const planSchema = z.object({
  planId: z.string().nullable(),
  studentId: z.string().min(1),
  name: z.string().trim().min(2, "Dê um nome ao plano").max(80),
  notes: z.string().trim().max(1000).nullable(),
  days: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Dê um nome a cada dia").max(80),
        items: z.array(planItemSchema).min(1, "Cada dia precisa de ao menos 1 exercício").max(30),
      }),
    )
    .min(1, "Adicione ao menos um dia de treino")
    .max(7),
});
export type PlanInput = z.infer<typeof planSchema>;

export const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  muscleGroup: z.string().min(1),
  equipment: z.string().trim().max(40).nullable(),
  instructions: z.string().trim().max(1500).nullable(),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

/** Formata segundos como 1:30 / 45s. */
export function formatRest(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}
