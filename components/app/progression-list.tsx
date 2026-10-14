import { TrendingDown, TrendingUp } from "lucide-react";
import { PillBars } from "@/components/app/pill-bars";
import { muscleLabel } from "@/lib/exercises";
import type { ExerciseProgress } from "@/lib/workout-history";
import { formatDay } from "@/lib/week";

const kg = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const dm = (d: Date) => formatDay(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));

/** Cards de evolução por exercício: melhor série atual, 1RM estimado e tendência. */
export function ProgressionList({ items, compact = false }: { items: ExerciseProgress[]; compact?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-chumbo-100/60">A evolução aparece depois dos primeiros treinos concluídos.</p>;
  return (
    <ul className={compact ? "flex flex-col gap-3" : "grid gap-4 lg:grid-cols-2"}>
      {items.map((ex) => {
        const first = ex.sessions[0];
        const last = ex.sessions.at(-1)!;
        const metric = (s: (typeof ex.sessions)[number]) => s.best.e1rm ?? s.best.loadKg;
        const a = metric(first);
        const b = metric(last);
        const delta = a && b && ex.sessions.length > 1 ? Math.round(((b - a) / a) * 1000) / 10 : null;
        return (
          <li key={ex.exerciseId} className="glass flex flex-col gap-4 rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="label-mono">{muscleLabel(ex.muscleGroup)} · {ex.sessions.length} sessões</p>
                <h3 className="mt-1 truncate text-lg font-medium">{ex.name}</h3>
              </div>
              {delta != null && (
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs ${delta >= 0 ? "bg-orange/15 text-orange" : "bg-white/5 text-chumbo-100/70"}`}>
                  {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {delta > 0 ? "+" : ""}
                  {kg(delta)}%
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="num-dot text-4xl">{last.best.loadKg != null ? kg(last.best.loadKg) : "—"}</p>
                <p className="label-mono mt-1 !text-[0.6rem]">
                  kg × {last.best.reps ?? "—"}
                  {last.best.rir != null && ` · RIR ${last.best.rir}`} · {dm(last.date)}
                </p>
              </div>
              {last.best.e1rm != null && (
                <div>
                  <p className="num-thin text-3xl">{kg(last.best.e1rm)}</p>
                  <p className="label-mono mt-1 !text-[0.6rem]">1RM estimado (kg)</p>
                </div>
              )}
              {!compact && (
                <div>
                  <p className="num-thin text-3xl">{kg(last.volumeKg)}</p>
                  <p className="label-mono mt-1 !text-[0.6rem]">Volume (kg × reps)</p>
                </div>
              )}
            </div>
            {!compact && ex.sessions.length > 1 && (
              <PillBars height={90} data={ex.sessions.map((s) => ({ label: dm(s.date), value: metric(s) }))} format={(v) => `${kg(v)} kg`} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
