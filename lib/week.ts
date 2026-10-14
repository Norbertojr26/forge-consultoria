import { TZDate } from "@date-fns/tz";
import { startOfWeek } from "date-fns";

export const TIMEZONE = "America/Sao_Paulo";

/**
 * Domingo da semana de `date` no fuso de São Paulo, como meia-noite UTC.
 * É o formato que o Prisma grava numa coluna @db.Date sem deslocar o dia.
 */
export function weekOf(date: Date = new Date()): Date {
  const sunday = startOfWeek(new TZDate(date, TIMEZONE), { weekStartsOn: 0 });
  return new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()));
}

/** Soma dias a uma data @db.Date (meia-noite UTC) sem depender do fuso do servidor. */
export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Número de semanas entre dois domingos (b − a). */
export function weeksBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (7 * 86_400_000));
}

/** Formata uma data @db.Date como dd/mm sem aplicar fuso. */
export function formatDay(date: Date, opts: { year?: boolean } = {}): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return opts.year ? `${d}/${m}/${date.getUTCFullYear()}` : `${d}/${m}`;
}


/** Dia corrente em São Paulo como meia-noite UTC (formato das colunas @db.Date). */
export function todaySP(now: Date = new Date()): Date {
  const d = new TZDate(now, TIMEZONE);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

