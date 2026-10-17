"use client";

import { Check, Moon, Plus, StretchHorizontal, Timer, Trash2, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCardioLog, logCardio, logSleep, toggleMobility } from "@/lib/actions/routine";
import { CARDIO_KINDS, type CardioKind, cardioKindLabel, formatHours, SLEEP_QUALITY, sleepHours, sleepQualityLabel } from "@/lib/routine";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none transition-colors focus:border-orange/60";
const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 font-mono text-xs transition-colors",
    on ? "border-orange bg-orange text-black" : "border-white/10 bg-white/[0.04] text-chumbo-100/80 hover:border-orange/60",
  );
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// ─── Sono ─────────────────────────────────────────────────

export function SleepLogger({
  goalHours,
  bedtimeTarget,
  today,
}: {
  goalHours: number | null;
  bedtimeTarget: string | null;
  today: { bedtime: string; wakeTime: string; hours: number; quality: number } | null;
}) {
  const [editing, setEditing] = useState(!today);
  const [daysAgo, setDaysAgo] = useState(0);
  const [bedtime, setBedtime] = useState(today?.bedtime ?? bedtimeTarget ?? "23:00");
  const [wakeTime, setWakeTime] = useState(today?.wakeTime ?? "07:00");
  const [quality, setQuality] = useState(today?.quality ?? 3);
  const [pending, start] = useTransition();
  const valid = HHMM.test(bedtime) && HHMM.test(wakeTime);
  const hours = valid ? sleepHours(bedtime, wakeTime) : null;

  function save() {
    start(async () => {
      const r = await logSleep({ bedtime, wakeTime, quality, notes: null, daysAgo });
      if (!r.ok) return void toast.error(r.error);
      toast.success(daysAgo ? "Noite de ontem registrada." : "Noite registrada.");
      if (daysAgo === 0) setEditing(false);
    });
  }

  if (today && !editing) {
    const hit = goalHours != null && today.hours >= goalHours - 0.25;
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={cn("num-dot text-4xl", hit && "text-orange")}>{formatHours(today.hours)}</p>
          <p className="mt-1 text-sm text-chumbo-100/60">
            {today.bedtime} → {today.wakeTime} · {sleepQualityLabel(today.quality)}
            {goalHours != null && (hit ? " · meta batida" : ` · meta ${formatHours(goalHours)}`)}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-orange hover:underline">
          Corrigir
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {["Esta noite", "Noite anterior"].map((l, i) => (
          <button key={l} type="button" onClick={() => setDaysAgo(i)} className={chip(daysAgo === i)}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="label-mono !text-[0.6rem]">Dormi às</span>
          <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-mono !text-[0.6rem]">Acordei às</span>
          <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className={inputCls} />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="label-mono !text-[0.6rem]">Qualidade</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Qualidade do sono">
          {SLEEP_QUALITY.map((q) => (
            <button key={q.value} type="button" role="radio" aria-checked={quality === q.value} onClick={() => setQuality(q.value)} className={chip(quality === q.value)}>
              {q.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-chumbo-100/70">
          {hours != null ? (
            <>
              <span className="num-thin text-2xl text-white">{formatHours(hours)}</span> de sono
            </>
          ) : (
            "Preencha os horários"
          )}
        </p>
        <div className="flex gap-2">
          {today && (
            <button type="button" onClick={() => setEditing(false)} className="rounded-full px-3 py-2 text-xs text-chumbo-100/60 hover:text-white">
              Cancelar
            </button>
          )}
          <button
            type="button"
            disabled={pending || !valid}
            onClick={save}
            className="glow flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-black uppercase disabled:opacity-60"
          >
            <Moon className="size-4" /> Salvar noite
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cardio ───────────────────────────────────────────────

type Prescription = { id: string; kind: string; modality: string; durationMin: number; perWeek: number; intensity: string | null; notes: string | null; done: number };
type CardioEntry = { id: string; kind: string; modality: string; durationMin: number; distanceKm: number | null; avgHr: number | null; rpe: number | null; dayLabel: string };

type Draft = { prescriptionId: string | null; kind: CardioKind; modality: string; durationMin: string; distanceKm: string; avgHr: string; rpe: number | null; daysAgo: number };

export function CardioTracker({ prescriptions, logs }: { prescriptions: Prescription[]; logs: CardioEntry[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();

  const open = (p?: Prescription) =>
    setDraft({
      prescriptionId: p?.id ?? null,
      kind: (p?.kind as CardioKind) ?? "LISS",
      modality: p?.modality ?? "",
      durationMin: p ? String(p.durationMin) : "",
      distanceKm: "",
      avgHr: "",
      rpe: null,
      daysAgo: 0,
    });
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  function save() {
    if (!draft) return;
    start(async () => {
      const r = await logCardio({
        prescriptionId: draft.prescriptionId,
        kind: draft.kind,
        modality: draft.modality,
        durationMin: num(draft.durationMin) ?? 0,
        distanceKm: num(draft.distanceKm),
        avgHr: num(draft.avgHr),
        rpe: draft.rpe,
        notes: null,
        daysAgo: draft.daysAgo,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Cardio registrado.");
      setDraft(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {prescriptions.map((p) => {
        const complete = p.done >= p.perWeek;
        return (
          <div key={p.id} className={cn("glass flex flex-col gap-3 rounded-3xl p-4", complete && "border-orange/40")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="label-mono !text-[0.6rem]">
                  {cardioKindLabel(p.kind)} · {p.perWeek}× por semana
                </p>
                <p className="mt-1 font-medium">
                  {p.modality} · {p.durationMin} min
                </p>
                {p.intensity && <p className="mt-0.5 text-sm text-orange">{p.intensity}</p>}
                {p.notes && <p className="mt-0.5 text-xs text-chumbo-100/60">{p.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-1" aria-label={`${p.done} de ${p.perWeek} nesta semana`}>
                {Array.from({ length: p.perWeek }, (_, i) => (
                  <span key={i} className={cn("size-2.5 rounded-full", i < p.done ? "glow bg-orange" : "bg-white/10")} />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => open(p)}
              className="flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:border-orange/60"
            >
              <Plus className="size-3.5" /> Registrar {complete ? "extra" : `${Math.min(p.done + 1, p.perWeek)}ª da semana`}
            </button>
          </div>
        );
      })}

      {!draft && (
        <button type="button" onClick={() => open()} className="flex w-fit items-center gap-1.5 text-xs text-chumbo-100/70 hover:text-white">
          <Plus className="size-3.5" /> {prescriptions.length ? "Outro cardio (fora do prescrito)" : "Registrar cardio"}
        </button>
      )}

      {draft && (
        <div className="glass flex flex-col gap-4 rounded-3xl border-orange/30 p-4">
          <div className="flex items-center justify-between">
            <p className="label-mono">Registrar cardio</p>
            <button type="button" onClick={() => setDraft(null)} aria-label="Fechar" className="text-chumbo-100/60 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {CARDIO_KINDS.map((k) => (
              <button key={k.value} type="button" title={k.hint} onClick={() => setDraft({ ...draft, kind: k.value })} className={chip(draft.kind === k.value)}>
                {k.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="col-span-2 flex flex-col gap-1.5">
              <span className="label-mono !text-[0.6rem]">Modalidade</span>
              <input value={draft.modality} onChange={(e) => setDraft({ ...draft, modality: e.target.value })} placeholder="Esteira, bike…" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono !text-[0.6rem]">Minutos</span>
              <input inputMode="numeric" value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono !text-[0.6rem]">Km (opc.)</span>
              <input inputMode="decimal" value={draft.distanceKm} onChange={(e) => setDraft({ ...draft, distanceKm: e.target.value })} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono !text-[0.6rem]">FC média (opc.)</span>
              <input inputMode="numeric" value={draft.avgHr} onChange={(e) => setDraft({ ...draft, avgHr: e.target.value })} placeholder="bpm" className={inputCls} />
            </label>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
              <span className="label-mono !text-[0.6rem]">Esforço (1 leve – 10 máximo)</span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button key={v} type="button" onClick={() => setDraft({ ...draft, rpe: draft.rpe === v ? null : v })} className={cn(chip(draft.rpe === v), "size-8 px-0")}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {["Hoje", "Ontem"].map((l, i) => (
                <button key={l} type="button" onClick={() => setDraft({ ...draft, daysAgo: i })} className={chip(draft.daysAgo === i)}>
                  {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="glow flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-black uppercase disabled:opacity-60"
            >
              <Timer className="size-4" /> Salvar cardio
            </button>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <ul className="glass divide-y divide-white/5 rounded-3xl">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">
                  <span className="text-chumbo-100/60">{l.dayLabel} · </span>
                  {cardioKindLabel(l.kind)} · {l.modality}
                </p>
                <p className="truncate text-xs text-chumbo-100/60">
                  {l.durationMin} min
                  {l.distanceKm != null && ` · ${l.distanceKm.toLocaleString("pt-BR")} km`}
                  {l.avgHr != null && ` · ${l.avgHr} bpm`}
                  {l.rpe != null && ` · esforço ${l.rpe}`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Excluir registro de cardio"
                disabled={pending}
                onClick={() => start(async () => void (await deleteCardioLog(l.id)))}
                className="shrink-0 p-1 text-chumbo-100/40 hover:text-white"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Mobilidade ───────────────────────────────────────────

export function MobilityRoutine({
  drills,
  notes,
  doneToday,
  daysThisWeek,
  target,
}: {
  drills: { id: string; name: string; prescription: string; notes: string | null }[];
  notes: string | null;
  doneToday: boolean;
  daysThisWeek: number;
  target: number | null;
}) {
  const [, start] = useTransition();
  const [done, setDone] = useOptimistic(doneToday);
  const days = daysThisWeek + (done === doneToday ? 0 : done ? 1 : -1);

  return (
    <div className="flex flex-col gap-4">
      {notes && <p className="text-sm text-chumbo-100/70">{notes}</p>}
      <ol className="flex flex-col gap-2">
        {drills.map((d, i) => (
          <li key={d.id} className="flex items-start gap-3">
            <span className="num-dot w-6 shrink-0 text-lg text-chumbo-100/50">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {d.name} <span className="font-normal text-orange">· {d.prescription}</span>
              </p>
              {d.notes && <p className="text-xs text-chumbo-100/60">{d.notes}</p>}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-4">
        <p className="text-sm text-chumbo-100/70">
          {days} {days === 1 ? "dia" : "dias"} nesta semana{target ? ` · meta ${target}` : ""}
        </p>
        <button
          type="button"
          aria-pressed={done}
          onClick={() =>
            start(async () => {
              setDone(!done);
              const r = await toggleMobility();
              if (!r.ok) toast.error(r.error);
            })
          }
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-xs tracking-[0.14em] uppercase transition-all",
            done ? "glow bg-orange text-black" : "border border-white/15 hover:border-orange/60",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : <StretchHorizontal className="size-4" />}
          {done ? "Feita hoje" : "Marcar como feita"}
        </button>
      </div>
    </div>
  );
}
