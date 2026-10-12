import { z } from "zod";

export const GOALS = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "cutting", label: "Cutting" },
  { value: "recomp", label: "Recomposição" },
  { value: "performance", label: "Performance" },
  { value: "saude", label: "Saúde metabólica" },
  { value: "manutencao", label: "Manutenção" },
] as const;

export const goalLabel = (value: string | null | undefined) =>
  GOALS.find((g) => g.value === value)?.label ?? null;

export const MOODS = [
  { value: 1, label: "Péssimo" },
  { value: 2, label: "Ruim" },
  { value: 3, label: "Ok" },
  { value: 4, label: "Bem" },
  { value: 5, label: "Ótimo" },
] as const;

/** Aceita "80,5" ou "80.5". */
const decimal = (s: string) => Number(s.trim().replace(",", "."));

// Campos de formulário chegam como string; o mesmo schema roda no cliente e no servidor.
export const checkInSchema = z.object({
  weightKg: z
    .string()
    .trim()
    .min(1, "Informe o peso")
    .refine((s) => /^\d{2,3}([.,]\d{1,2})?$/.test(s), "Use o formato 80,5")
    .refine((s) => decimal(s) >= 30 && decimal(s) <= 300, "Peso entre 30 e 300 kg"),
  mood: z.string().refine((s) => ["1", "2", "3", "4", "5"].includes(s), "Escolha de 1 a 5"),
  notes: z.string().trim().max(1000, "Máximo de 1000 caracteres"),
});
export type CheckInInput = z.infer<typeof checkInSchema>;
export const parseWeight = decimal;

const MIN_AGE = 12;
const MAX_AGE = 100;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80, "Máximo de 80 caracteres"),
  birthDate: z
    .string()
    .refine((s) => s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s), "Data inválida")
    .refine((s) => {
      if (s === "") return true;
      const age = (Date.now() - new Date(`${s}T00:00:00Z`).getTime()) / (365.25 * 86_400_000);
      return age >= MIN_AGE && age <= MAX_AGE;
    }, `Idade entre ${MIN_AGE} e ${MAX_AGE} anos`),
  heightCm: z
    .string()
    .trim()
    .refine((s) => s === "" || (/^\d{3}$/.test(s) && +s >= 100 && +s <= 250), "Altura em cm, entre 100 e 250"),
  goal: z.string().refine((s) => s === "" || GOALS.some((g) => g.value === s), "Objetivo inválido"),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };
