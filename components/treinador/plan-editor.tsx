"use client";

import { ArrowDown, ArrowUp, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ExerciseImage } from "@/components/app/exercise-image";
import { savePlan } from "@/lib/actions/trainer";
import { MUSCLE_GROUPS, muscleLabel } from "@/lib/exercises";
import { cn } from "@/lib/utils";
import { formatRest } from "@/lib/validations-workout";

export type CatalogExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  sourceId: string | null;
  imageUrl: string | null;
};

type Item = { key: string; exerciseId: string; sets: string; reps: string; loadKg: string; restSeconds: number; targetRir: number | null; notes: string };
type Day = { key: string; name: string; items: Item[] };

export type EditorPlan = {
  planId: string | null;
  name: string;
  notes: string;
  days: { name: string; items: { exerciseId: string; sets: number; reps: string; loadKg: number | null; restSeconds: number; targetRir: number | null; notes: string | null }[] }[];
};

const REST_PRESETS = [30, 45, 60, 90, 120, 180];
const uid = () => Math.random().toString(36).slice(2, 10);

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none transition-colors focus:border-orange/60 disabled:opacity-60";

export function PlanEditor({
  studentId,
  studentName,
  catalog,
  initial,
  locked,
}: {
  studentId: string;
  studentName: string;
  catalog: CatalogExercise[];
  initial: EditorPlan;
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [planId, setPlanId] = useState(initial.planId);
  const [name, setName] = useState(initial.name);
  const [notes, setNotes] = useState(initial.notes);
  const [days, setDays] = useState<Day[]>(() =>
    initial.days.length
      ? initial.days.map((d) => ({
          key: uid(),
          name: d.name,
          items: d.items.map((it) => ({
            key: uid(),
            exerciseId: it.exerciseId,
            sets: String(it.sets),
            reps: it.reps,
            loadKg: it.loadKg != null ? String(it.loadKg) : "",
            restSeconds: it.restSeconds,
            targetRir: it.targetRir,
            notes: it.notes ?? "",
          })),
        }))
      : [{ key: uid(), name: "Treino A", items: [] }],
  );
  const [picker, setPicker] = useState<string | null>(null); // key do dia que está recebendo exercício
  const [dirty, setDirty] = useState(false);
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);

  const mutate = (fn: (d: Day[]) => Day[]) => {
    setDays(fn);
    setDirty(true);
  };
  const updateDay = (key: string, patch: Partial<Day>) => mutate((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const updateItem = (dayKey: string, itemKey: string, patch: Partial<Item>) =>
    mutate((ds) => ds.map((d) => (d.key === dayKey ? { ...d, items: d.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)) } : d)));
  const moveItem = (dayKey: string, index: number, dir: -1 | 1) =>
    mutate((ds) =>
      ds.map((d) => {
        if (d.key !== dayKey) return d;
        const items = [...d.items];
        const j = index + dir;
        if (j < 0 || j >= items.length) return d;
        [items[index], items[j]] = [items[j], items[index]];
        return { ...d, items };
      }),
    );

  function addExercise(dayKey: string, ex: CatalogExercise) {
    mutate((ds) =>
      ds.map((d) =>
        d.key === dayKey
          ? {
              ...d,
              items: [
                ...d.items,
                { key: uid(), exerciseId: ex.id, sets: "3", reps: ex.muscleGroup === "cardio" ? "20 min" : "10-12", loadKg: "", restSeconds: ex.muscleGroup === "cardio" ? 0 : 60, targetRir: ex.muscleGroup === "cardio" ? null : 2, notes: "" },
              ],
            }
          : d,
      ),
    );
    toast.success(`${ex.name} adicionado`);
  }

  function save() {
    start(async () => {
      const r = await savePlan({
        planId,
        studentId,
        name,
        notes: notes.trim() || null,
        days: days.map((d) => ({
          name: d.name,
          items: d.items.map((it) => ({
            exerciseId: it.exerciseId,
            sets: Number(it.sets),
            reps: it.reps,
            loadKg: it.loadKg.trim() === "" ? null : Number(it.loadKg.replace(",", ".")),
            restSeconds: it.restSeconds,
            targetRir: it.targetRir,
            notes: it.notes.trim() || null,
          })),
        })),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success("Plano salvo");
      if (!planId && r.planId) {
        setPlanId(r.planId);
        router.replace(`/treinador/alunos/${studentId}/plano/${r.planId}`);
      } else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {locked && (
        <p className="rounded-2xl border border-orange/30 bg-orange/10 px-4 py-3 text-sm text-orange-bright">
          {studentName} já treinou com este plano, então ele está travado para preservar o histórico. Use “Duplicar” na página do aluno para criar uma nova versão.
        </p>
      )}

      <div className="glass grid gap-4 rounded-3xl p-5 md:grid-cols-[1fr_1.4fr]">
        <label className="flex flex-col gap-2">
          <span className="label-mono">Nome do plano</span>
          <input value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} disabled={locked} className={inputCls} placeholder="Hipertrofia — ciclo 1" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label-mono">Observações gerais (opcional)</span>
          <input value={notes} onChange={(e) => (setNotes(e.target.value), setDirty(true))} disabled={locked} className={inputCls} placeholder="Aquecer 10 min antes. Cadência 2-0-2." />
        </label>
      </div>

      {days.map((day, dIndex) => (
        <section key={day.key} className="glass flex flex-col gap-4 rounded-[2rem] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange/15 font-mono text-sm text-orange">
              {String.fromCharCode(65 + dIndex)}
            </span>
            <input
              value={day.name}
              onChange={(e) => updateDay(day.key, { name: e.target.value })}
              disabled={locked}
              className={cn(inputCls, "text-base font-medium")}
              aria-label="Nome do dia"
            />
            {!locked && days.length > 1 && (
              <button
                type="button"
                onClick={() => confirm(`Remover “${day.name}”?`) && mutate((ds) => ds.filter((d) => d.key !== day.key))}
                className="text-chumbo-100/50 hover:text-destructive"
                aria-label="Remover dia"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>

          {day.items.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 py-6 text-center text-sm text-chumbo-100/50">Nenhum exercício neste dia.</p>}

          <ol className="flex flex-col gap-3">
            {day.items.map((it, i) => {
              const ex = byId.get(it.exerciseId);
              return (
                <li key={it.key} className="grid gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 md:grid-cols-[88px_1fr]">
                  <ExerciseImage name={ex?.name ?? "?"} imageUrl={ex?.imageUrl} sourceId={ex?.sourceId} className="size-[88px]" />
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {i + 1}. {ex?.name ?? "Exercício removido"}
                        </p>
                        <p className="text-xs text-chumbo-100/50">
                          {ex && muscleLabel(ex.muscleGroup)}
                          {ex?.equipment && ` · ${ex.equipment}`}
                        </p>
                      </div>
                      {!locked && (
                        <div className="flex shrink-0 items-center gap-1 text-chumbo-100/50">
                          <button type="button" onClick={() => moveItem(day.key, i, -1)} disabled={i === 0} className="p-1 hover:text-white disabled:opacity-30" aria-label="Subir">
                            <ArrowUp className="size-4" />
                          </button>
                          <button type="button" onClick={() => moveItem(day.key, i, 1)} disabled={i === day.items.length - 1} className="p-1 hover:text-white disabled:opacity-30" aria-label="Descer">
                            <ArrowDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDay(day.key, { items: day.items.filter((x) => x.key !== it.key) })}
                            className="p-1 hover:text-destructive"
                            aria-label="Remover exercício"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[0.65rem] text-chumbo-100/50 uppercase">Séries</span>
                        <input inputMode="numeric" value={it.sets} onChange={(e) => updateItem(day.key, it.key, { sets: e.target.value })} disabled={locked} className={inputCls} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[0.65rem] text-chumbo-100/50 uppercase">Repetições</span>
                        <input value={it.reps} onChange={(e) => updateItem(day.key, it.key, { reps: e.target.value })} disabled={locked} className={inputCls} placeholder="8-12" />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[0.65rem] text-chumbo-100/50 uppercase">Carga (kg)</span>
                        <input inputMode="decimal" value={it.loadKg} onChange={(e) => updateItem(day.key, it.key, { loadKg: e.target.value })} disabled={locked} className={inputCls} placeholder="livre" />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[0.65rem] text-chumbo-100/50 uppercase">Descanso</span>
                      {REST_PRESETS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          disabled={locked}
                          onClick={() => updateItem(day.key, it.key, { restSeconds: sec })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            it.restSeconds === sec ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70 hover:border-white/30",
                          )}
                        >
                          {formatRest(sec)}
                        </button>
                      ))}
                      <input
                        inputMode="numeric"
                        aria-label="Descanso personalizado em segundos"
                        value={REST_PRESETS.includes(it.restSeconds) ? "" : String(it.restSeconds)}
                        onChange={(e) => updateItem(day.key, it.key, { restSeconds: Math.max(0, Math.min(900, Number(e.target.value) || 0)) })}
                        disabled={locked}
                        placeholder="seg"
                        className="w-16 rounded-full border border-white/10 bg-transparent px-2.5 py-1 text-xs outline-none focus:border-orange/60"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[0.65rem] text-chumbo-100/50 uppercase" title="Repetições na reserva: quantas o aluno deve deixar sobrando (0 = falha). RPE = 10 − RIR.">
                        Alvo RIR
                      </span>
                      {[null, 0, 1, 2, 3, 4].map((r) => (
                        <button
                          key={r ?? "none"}
                          type="button"
                          disabled={locked}
                          onClick={() => updateItem(day.key, it.key, { targetRir: r })}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            it.targetRir === r ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70 hover:border-white/30",
                          )}
                        >
                          {r == null ? "—" : r === 0 ? "0 · falha" : r === 4 ? "4+" : r}
                        </button>
                      ))}
                    </div>
                    <input
                      value={it.notes}
                      onChange={(e) => updateItem(day.key, it.key, { notes: e.target.value })}
                      disabled={locked}
                      className={inputCls}
                      placeholder="Observação para o aluno (ex.: drop-set na última série)"
                    />
                  </div>
                </li>
              );
            })}
          </ol>

          {!locked && (
            <button
              type="button"
              onClick={() => setPicker(day.key)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-orange/40 py-3 text-sm text-orange hover:bg-orange/5"
            >
              <Plus className="size-4" /> Adicionar exercício
            </button>
          )}
        </section>
      ))}

      {!locked && (
        <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => mutate((ds) => [...ds, { key: uid(), name: `Treino ${String.fromCharCode(65 + ds.length)}`, items: [] }])}
            disabled={days.length >= 7}
            className="glass flex items-center gap-2 rounded-full px-5 py-3 text-sm disabled:opacity-40"
          >
            <Plus className="size-4" /> Adicionar dia
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className={cn(
              "flex items-center gap-2 rounded-full px-6 py-3 font-mono text-xs uppercase tracking-[0.14em] transition-all",
              dirty || !planId ? "glow bg-orange text-black" : "glass text-chumbo-100",
            )}
          >
            <Save className="size-4" /> {pending ? "Salvando…" : dirty || !planId ? "Salvar plano" : "Salvo"}
          </button>
        </div>
      )}

      {picker && (
        <ExercisePicker
          catalog={catalog}
          onClose={() => setPicker(null)}
          onPick={(ex) => addExercise(picker, ex)}
          dayName={days.find((d) => d.key === picker)?.name ?? ""}
        />
      )}
    </div>
  );
}

function ExercisePicker({
  catalog,
  onPick,
  onClose,
  dayName,
}: {
  catalog: CatalogExercise[];
  onPick: (ex: CatalogExercise) => void;
  onClose: () => void;
  dayName: string;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const list = catalog.filter((e) => (!group || e.muscleGroup === group) && (!q || norm(e.name).includes(norm(q))));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-label="Catálogo de exercícios" onClick={onClose}>
      <div className="glass flex max-h-[90svh] w-full max-w-4xl flex-col gap-4 rounded-t-[2rem] p-5 md:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-mono">Adicionar a {dayName}</p>
            <h2 className="text-xl font-semibold">Catálogo de exercícios</h2>
          </div>
          <button type="button" onClick={onClose} className="text-chumbo-100/60 hover:text-white" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-chumbo-100/50" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar exercício" className={cn(inputCls, "pl-9")} />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ value: null, label: "Todos" }, ...MUSCLE_GROUPS].map((m) => (
            <button
              key={m.value ?? "all"}
              type="button"
              onClick={() => setGroup(m.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs",
                group === m.value ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70 hover:border-white/30",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <ul className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((ex) => (
            <li key={ex.id}>
              <button type="button" onClick={() => onPick(ex)} className="group flex w-full flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-2 text-left transition-colors hover:border-orange/50">
                <ExerciseImage name={ex.name} imageUrl={ex.imageUrl} sourceId={ex.sourceId} className="aspect-square w-full" />
                <span className="px-1 text-sm leading-tight">{ex.name}</span>
                <span className="px-1 pb-1 text-[0.65rem] text-chumbo-100/50 uppercase">{muscleLabel(ex.muscleGroup)}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="col-span-full py-10 text-center text-sm text-chumbo-100/50">Nenhum exercício encontrado.</li>}
        </ul>
      </div>
    </div>
  );
}
