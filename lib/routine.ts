import { z } from "zod";

// ─── Tipos de cardio ──────────────────────────────────────

export const CARDIO_KINDS = [
  { value: "LISS", label: "LISS", hint: "Contínuo leve: dá para conversar" },
  { value: "Z2", label: "Zona 2", hint: "Moderado: ~60–70% da FC máx." },
  { value: "HIIT", label: "HIIT", hint: "Intervalado: tiros fortes e recuperação" },
  { value: "OUTRO", label: "Outro", hint: "Esporte, caminhada livre, etc." },
] as const;
export type CardioKind = (typeof CARDIO_KINDS)[number]["value"];
const KIND_VALUES = CARDIO_KINDS.map((k) => k.value) as [CardioKind, ...CardioKind[]];
export const cardioKindLabel = (v: string) => CARDIO_KINDS.find((k) => k.value === v)?.label ?? v;

export const SLEEP_QUALITY = [
  { value: 1, label: "Péssimo" },
  { value: 2, label: "Ruim" },
  { value: 3, label: "Ok" },
  { value: 4, label: "Bom" },
  { value: 5, label: "Ótimo" },
] as const;
export const sleepQualityLabel = (v: number) => SLEEP_QUALITY.find((q) => q.value === v)?.label ?? "—";

// ─── Cálculos ─────────────────────────────────────────────

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Horas dormidas entre deitar e acordar (atravessa a meia-noite), em passos de 0,25 h. */
export function sleepHours(bedtime: string, wakeTime: string): number {
  let diff = toMin(wakeTime) - toMin(bedtime);
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 4) / 4;
}

/** "7h30" a partir de horas decimais. */
export function formatHours(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm ? `${hh}h${String(mm).padStart(2, "0")}` : `${hh}h`;
}

type SleepEntry = { hours: number; quality: number };

/** Média de horas e qualidade; null sem registros. */
export function sleepStats(logs: SleepEntry[], goal?: number | null) {
  if (!logs.length) return null;
  const avgHours = logs.reduce((s, l) => s + l.hours, 0) / logs.length;
  const avgQuality = logs.reduce((s, l) => s + l.quality, 0) / logs.length;
  return {
    nights: logs.length,
    avgHours: Math.round(avgHours * 100) / 100,
    avgQuality: Math.round(avgQuality * 10) / 10,
    // noites que bateram a meta (15 min de tolerância)
    onGoal: goal ? logs.filter((l) => l.hours >= goal - 0.25).length : null,
  };
}

type Prescribed = { id: string; kind: string; durationMin: number; perWeek: number };
type Done = { prescriptionId: string | null; kind: string; durationMin: number };

/**
 * Cardio da semana: sessões feitas por prescrição (registro ligado a ela; registros avulsos do
 * mesmo tipo completam vagas que sobrarem) e minutos feitos × prescritos.
 */
export function cardioWeek(prescribed: Prescribed[], logs: Done[]) {
  const count = new Map(prescribed.map((p) => [p.id, 0]));
  const loose: Done[] = [];
  for (const l of logs) {
    if (l.prescriptionId && count.has(l.prescriptionId)) count.set(l.prescriptionId, count.get(l.prescriptionId)! + 1);
    else loose.push(l);
  }
  for (const l of loose) {
    const p = prescribed.find((x) => x.kind === l.kind && count.get(x.id)! < x.perWeek);
    if (p) count.set(p.id, count.get(p.id)! + 1);
  }
  const perPrescription = prescribed.map((p) => ({ id: p.id, done: count.get(p.id)!, target: p.perWeek }));
  return {
    perPrescription,
    sessions: logs.length,
    targetSessions: prescribed.reduce((s, p) => s + p.perWeek, 0),
    minutes: logs.reduce((s, l) => s + l.durationMin, 0),
    targetMinutes: prescribed.reduce((s, p) => s + p.durationMin * p.perWeek, 0),
  };
}

// ─── Validação ────────────────────────────────────────────

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);

export const cardioPrescriptionSchema = z.object({
  kind: z.enum(KIND_VALUES),
  modality: z.string().trim().min(1, "Informe a modalidade do cardio").max(60),
  durationMin: z.coerce.number().int().min(5, "Cardio de no mínimo 5 min").max(240),
  perWeek: z.coerce.number().int().min(1).max(14),
  intensity: optText(120),
  notes: optText(300),
});

export const mobilityDrillSchema = z.object({
  name: z.string().trim().min(1, "Informe o exercício de mobilidade").max(80),
  prescription: z.string().trim().min(1, "Informe séries/tempo da mobilidade").max(60),
  notes: optText(200),
});

export const routineSchema = z.object({
  studentId: z.string().min(1),
  sleepGoalHours: z.union([z.null(), z.coerce.number().min(4).max(12)]),
  bedtime: z.union([z.null(), z.string().regex(HHMM, "Horário inválido")]),
  sleepNotes: optText(300),
  mobilityPerWeek: z.union([z.null(), z.coerce.number().int().min(1).max(7)]),
  mobilityNotes: optText(300),
  cardio: z.array(cardioPrescriptionSchema).max(10),
  mobility: z.array(mobilityDrillSchema).max(20),
});
export type RoutineInput = z.input<typeof routineSchema>;

export const cardioLogSchema = z.object({
  prescriptionId: z.string().nullable(),
  kind: z.enum(KIND_VALUES),
  modality: z.string().trim().min(1, "Informe a modalidade").max(60),
  durationMin: z.coerce.number().int().min(1, "Informe a duração").max(600),
  distanceKm: z.union([z.null(), z.coerce.number().min(0).max(300)]),
  avgHr: z.union([z.null(), z.coerce.number().int().min(40).max(230)]),
  rpe: z.union([z.null(), z.coerce.number().int().min(1).max(10)]),
  notes: optText(300),
  daysAgo: z.coerce.number().int().min(0).max(6).default(0),
});
export type CardioLogInput = z.input<typeof cardioLogSchema>;

export const sleepLogSchema = z.object({
  bedtime: z.string().regex(HHMM, "Horário de dormir inválido"),
  wakeTime: z.string().regex(HHMM, "Horário de acordar inválido"),
  quality: z.coerce.number().int().min(1).max(5),
  notes: optText(300),
  daysAgo: z.coerce.number().int().min(0).max(6).default(0),
});
export type SleepLogInput = z.input<typeof sleepLogSchema>;
