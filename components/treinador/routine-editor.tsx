"use client";

import { ArrowDown, ArrowUp, HeartPulse, Moon, Plus, Save, StretchHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRoutine } from "@/lib/actions/routine";
import { CARDIO_KINDS, type CardioKind } from "@/lib/routine";
import { cn } from "@/lib/utils";

export type EditorRoutine = {
  sleepGoalHours: number | null;
  bedtime: string | null;
  sleepNotes: string | null;
  mobilityPerWeek: number | null;
  mobilityNotes: string | null;
  cardio: { kind: string; modality: string; durationMin: number; perWeek: number; intensity: string | null; notes: string | null }[];
  mobility: { name: string; prescription: string; notes: string | null }[];
};

type Cardio = { key: string; kind: CardioKind; modality: string; durationMin: string; perWeek: number; intensity: string; notes: string };
type Drill = { key: string; name: string; prescription: string; notes: string };

const uid = () => Math.random().toString(36).slice(2, 10);
const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none transition-colors focus:border-orange/60";
const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 font-mono text-xs transition-colors",
    on ? "border-orange bg-orange text-black" : "border-white/10 bg-white/[0.04] text-chumbo-100/80 hover:border-orange/60",
  );

const SLEEP_GOALS = [7, 7.5, 8, 8.5, 9];
// Sugestão de intensidade por tipo ao trocar (o treinador ajusta)
const INTENSITY_HINT: Record<CardioKind, string> = {
  LISS: "Ritmo leve, dá para conversar",
  Z2: "FC ~60–70% da máxima",
  HIIT: "10× 30s forte / 90s leve",
  OUTRO: "",
};
// Base para começar rápido
const MOBILITY_STARTER: Omit<Drill, "key">[] = [
  { name: "Gato-camelo", prescription: "2×10", notes: "" },
  { name: "Rotação torácica deitado", prescription: "2×8 cada lado", notes: "" },
  { name: "Alongamento de flexor de quadril (afundo)", prescription: "2×30s cada lado", notes: "" },
  { name: "Agachamento profundo segurando apoio", prescription: "2×40s", notes: "" },
  { name: "Mobilidade de tornozelo na parede", prescription: "2×10 cada lado", notes: "" },
];

export function RoutineEditor({ studentId, initial }: { studentId: string; initial: EditorRoutine }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sleepGoal, setSleepGoal] = useState(initial.sleepGoalHours != null ? String(initial.sleepGoalHours).replace(".", ",") : "");
  const [bedtime, setBedtime] = useState(initial.bedtime ?? "");
  const [sleepNotes, setSleepNotes] = useState(initial.sleepNotes ?? "");
  const [cardio, setCardio] = useState<Cardio[]>(() =>
    initial.cardio.map((c) => ({ key: uid(), kind: c.kind as CardioKind, modality: c.modality, durationMin: String(c.durationMin), perWeek: c.perWeek, intensity: c.intensity ?? "", notes: c.notes ?? "" })),
  );
  const [mobPerWeek, setMobPerWeek] = useState<number | null>(initial.mobilityPerWeek);
  const [mobNotes, setMobNotes] = useState(initial.mobilityNotes ?? "");
  const [drills, setDrills] = useState<Drill[]>(() => initial.mobility.map((m) => ({ key: uid(), name: m.name, prescription: m.prescription, notes: m.notes ?? "" })));

  const setC = (key: string, patch: Partial<Cardio>) => setCardio((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const setD = (key: string, patch: Partial<Drill>) => setDrills((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const move = <T,>(arr: T[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  function save() {
    start(async () => {
      const r = await saveRoutine({
        studentId,
        sleepGoalHours: sleepGoal.trim() ? Number(sleepGoal.replace(",", ".")) : null,
        bedtime: bedtime || null,
        sleepNotes,
        mobilityPerWeek: drills.length ? mobPerWeek : null,
        mobilityNotes: mobNotes,
        cardio: cardio.map(({ kind, modality, durationMin, perWeek, intensity, notes }) => ({ kind, modality, durationMin: Number(durationMin), perWeek, intensity, notes })),
        mobility: drills.map(({ name, prescription, notes }) => ({ name, prescription, notes })),
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Rotina salva — o aluno já vê as mudanças.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sono */}
      <section className="glass flex flex-col gap-4 rounded-3xl p-5">
        <p className="label-mono flex items-center gap-2">
          <Moon className="size-4" /> Sono
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="label-mono !text-[0.6rem]">Meta por noite (h)</span>
            <div className="flex flex-wrap gap-2">
              {SLEEP_GOALS.map((g) => {
                const v = String(g).replace(".", ",");
                return (
                  <button key={g} type="button" onClick={() => setSleepGoal(sleepGoal === v ? "" : v)} className={chip(sleepGoal === v)}>
                    {v}h
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex w-32 flex-col gap-1.5">
            <span className="label-mono !text-[0.6rem]">Deitar até</span>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className={inputCls} />
          </label>
        </div>
        <textarea
          value={sleepNotes}
          onChange={(e) => setSleepNotes(e.target.value)}
          rows={2}
          placeholder="Orientações (ex.: telas desligadas 1h antes, quarto escuro, cafeína até 15h)"
          className={inputCls}
        />
      </section>

      {/* Cardio */}
      <section className="glass flex flex-col gap-4 rounded-3xl p-5">
        <p className="label-mono flex items-center gap-2">
          <HeartPulse className="size-4" /> Cardio prescrito
        </p>
        {cardio.length === 0 && <p className="text-sm text-chumbo-100/60">Sem cardio prescrito. O aluno ainda pode registrar cardios avulsos.</p>}
        {cardio.map((c, i) => (
          <div key={c.key} className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {CARDIO_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    title={k.hint}
                    onClick={() => setC(c.key, { kind: k.value, intensity: c.intensity && c.intensity !== INTENSITY_HINT[c.kind] ? c.intensity : INTENSITY_HINT[k.value] })}
                    className={chip(c.kind === k.value)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 text-chumbo-100/50">
                <button type="button" aria-label="Subir cardio" onClick={() => setCardio((cs) => move(cs, i, -1))} className="p-1 hover:text-white">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" aria-label="Descer cardio" onClick={() => setCardio((cs) => move(cs, i, 1))} className="p-1 hover:text-white">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" aria-label="Remover cardio" onClick={() => setCardio((cs) => cs.filter((x) => x.key !== c.key))} className="p-1 hover:text-white">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className="label-mono !text-[0.6rem]">Modalidade</span>
                <input value={c.modality} onChange={(e) => setC(c.key, { modality: e.target.value })} placeholder="Esteira inclinada, bike…" className={inputCls} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-mono !text-[0.6rem]">Minutos</span>
                <input inputMode="numeric" value={c.durationMin} onChange={(e) => setC(c.key, { durationMin: e.target.value })} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-mono !text-[0.6rem]">Vezes/semana</span>
                <select value={c.perWeek} onChange={(e) => setC(c.key, { perWeek: Number(e.target.value) })} className={inputCls}>
                  {Array.from({ length: 7 }, (_, n) => n + 1).map((n) => (
                    <option key={n} value={n} className="bg-chumbo-900">
                      {n}×
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className="label-mono !text-[0.6rem]">Intensidade</span>
                <input value={c.intensity} onChange={(e) => setC(c.key, { intensity: e.target.value })} placeholder="FC 120–135 bpm" className={inputCls} />
              </label>
              <label className="col-span-2 flex flex-col gap-1.5">
                <span className="label-mono !text-[0.6rem]">Observação</span>
                <input value={c.notes} onChange={(e) => setC(c.key, { notes: e.target.value })} placeholder="Em jejum, após o treino…" className={inputCls} />
              </label>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCardio((cs) => [...cs, { key: uid(), kind: "LISS", modality: "", durationMin: "30", perWeek: 3, intensity: INTENSITY_HINT.LISS, notes: "" }])}
          className="flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:border-orange/60"
        >
          <Plus className="size-3.5" /> Adicionar cardio
        </button>
      </section>

      {/* Mobilidade */}
      <section className="glass flex flex-col gap-4 rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label-mono flex items-center gap-2">
            <StretchHorizontal className="size-4" /> Rotina de mobilidade
          </p>
          {drills.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setDrills(MOBILITY_STARTER.map((d) => ({ ...d, key: uid() })));
                setMobPerWeek((v) => v ?? 3);
              }}
              className="text-xs text-orange hover:underline"
            >
              Usar rotina base (5 exercícios)
            </button>
          )}
        </div>
        {drills.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="label-mono !text-[0.6rem]">Dias por semana</span>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }, (_, n) => n + 1).map((n) => (
                <button key={n} type="button" onClick={() => setMobPerWeek(mobPerWeek === n ? null : n)} className={chip(mobPerWeek === n)}>
                  {n}×
                </button>
              ))}
            </div>
          </div>
        )}
        {drills.map((d, i) => (
          <div key={d.key} className="grid grid-cols-[1fr_auto] items-start gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
            <input value={d.name} onChange={(e) => setD(d.key, { name: e.target.value })} placeholder="Exercício" aria-label="Exercício de mobilidade" className={inputCls} />
            <div className="row-span-3 flex gap-1 pt-1.5 text-chumbo-100/50 sm:order-last sm:row-span-1">
              <button type="button" aria-label="Subir exercício" onClick={() => setDrills((ds) => move(ds, i, -1))} className="p-1 hover:text-white">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" aria-label="Remover exercício" onClick={() => setDrills((ds) => ds.filter((x) => x.key !== d.key))} className="p-1 hover:text-white">
                <Trash2 className="size-4" />
              </button>
            </div>
            <input value={d.prescription} onChange={(e) => setD(d.key, { prescription: e.target.value })} placeholder="2×30s cada lado" aria-label="Séries ou tempo" className={inputCls} />
            <input value={d.notes} onChange={(e) => setD(d.key, { notes: e.target.value })} placeholder="Dica (opcional)" aria-label="Dica" className={inputCls} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setDrills((ds) => [...ds, { key: uid(), name: "", prescription: "", notes: "" }])}
          className="flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:border-orange/60"
        >
          <Plus className="size-3.5" /> Adicionar exercício
        </button>
        {drills.length > 0 && (
          <textarea value={mobNotes} onChange={(e) => setMobNotes(e.target.value)} rows={2} placeholder="Orientações gerais (ex.: antes do treino, sem dor)" className={inputCls} />
        )}
      </section>

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="glow sticky bottom-4 flex items-center gap-2 self-end rounded-full bg-orange px-6 py-3 font-mono text-xs tracking-[0.14em] text-black uppercase disabled:opacity-60"
      >
        <Save className="size-4" /> {pending ? "Salvando…" : "Salvar rotina"}
      </button>
    </div>
  );
}
