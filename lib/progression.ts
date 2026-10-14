/** Regras de progressão de carga (dupla progressão guiada por RIR). Funções puras, testadas. */

export type LoggedSet = { reps: number | null; loadKg: number | null; rir: number | null };

/** "8-12" → {8,12}; "10" → {10,10}; "até a falha"/"20 min" → null (sem faixa de repetições). */
export function parseRepRange(reps: string): { min: number; max: number } | null {
  if (/min|seg|s\b|falha/i.test(reps)) return null;
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return null;
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/** 1RM estimado (Epley). Acima de 12 reps a estimativa perde precisão: não calcula. */
export function estimate1RM(loadKg: number | null, reps: number | null): number | null {
  if (!loadKg || !reps || reps < 1 || reps > 12) return null;
  return Math.round(loadKg * (1 + reps / 30) * 10) / 10;
}

/** Melhor série: a de maior 1RM estimado (ou maior carga quando não dá para estimar). */
export function bestSet(sets: LoggedSet[]): (LoggedSet & { e1rm: number | null }) | null {
  const scored = sets.filter((s) => s.loadKg != null || s.reps != null).map((s) => ({ ...s, e1rm: estimate1RM(s.loadKg, s.reps) }));
  if (!scored.length) return null;
  return scored.reduce((a, b) => ((b.e1rm ?? b.loadKg ?? 0) > (a.e1rm ?? a.loadKg ?? 0) ? b : a));
}

/** Incremento de carga: menor em cargas leves (halteres, isoladores). */
export const loadIncrement = (loadKg: number) => (loadKg < 20 ? 1 : 2.5);
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export type Suggestion = { loadKg: number | null; reps: number | null; text: string };

/**
 * Sugestão para hoje a partir da última sessão do exercício.
 * - Todas as séries no topo da faixa e RIR ≥ alvo (sobrou fôlego) → sobe a carga.
 * - Alguma série abaixo do mínimo, ou RIR abaixo do alvo (passou do limite) → mantém a carga.
 * - Caso contrário → mesma carga, buscar +1 repetição.
 */
export function suggestNext(last: LoggedSet[], repsText: string, targetRir: number | null): Suggestion | null {
  const sets = last.filter((s) => s.reps != null);
  if (sets.length === 0) return null;
  const range = parseRepRange(repsText);
  const loads = sets.map((s) => s.loadKg).filter((l): l is number => l != null && l > 0);
  const top = loads.length ? Math.max(...loads) : null;
  const atTop = sets.filter((s) => s.loadKg === top || top == null);
  const rirs = atTop.map((s) => s.rir).filter((r): r is number => r != null);
  const minRir = rirs.length ? Math.min(...rirs) : null;
  const target = targetRir ?? 2;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  if (!range) return top != null ? { loadKg: top, reps: null, text: `Mesma carga da última vez (${fmt(top)} kg)` } : null;

  const repsAtTop = atTop.map((s) => s.reps!);
  const allTop = repsAtTop.every((r) => r >= range.max);
  const anyBelow = repsAtTop.some((r) => r < range.min);
  const tooHard = minRir != null && minRir < target;

  if (top != null && allTop && !tooHard) {
    const next = roundTo(top + loadIncrement(top), top < 20 ? 0.5 : 1.25);
    return { loadKg: next, reps: range.min, text: `Bateu ${range.max} reps${minRir != null ? ` com RIR ${minRir}` : ""} → suba para ${fmt(next)} kg` };
  }
  if (anyBelow || tooHard) {
    return {
      loadKg: top,
      reps: range.min,
      text: anyBelow
        ? `Mantenha ${top != null ? `${fmt(top)} kg` : "a carga"} e busque ${range.min}–${range.max} reps`
        : `Última vez passou do alvo (RIR ${minRir}) — mantenha ${top != null ? `${fmt(top)} kg` : "a carga"}`,
    };
  }
  const best = Math.max(...repsAtTop);
  return { loadKg: top, reps: Math.min(best + 1, range.max), text: `Mesma carga${top != null ? ` (${fmt(top)} kg)` : ""}, tente ${Math.min(best + 1, range.max)} reps` };
}

/** Rótulo do RIR com o RPE equivalente. */
export const rirLabel = (rir: number) => (rir >= 4 ? "RIR 4+" : `RIR ${rir}`) + ` · RPE ${10 - Math.min(rir, 4)}`;
