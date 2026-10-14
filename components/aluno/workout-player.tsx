"use client";

import { Check, ChevronLeft, ChevronRight, History, Minus, Pause, Play, Plus, SkipForward, Timer, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Ring } from "@/components/app/ring";
import { ExerciseImage } from "@/components/app/exercise-image";
import { finishSession, logSet, rateSet, startSession, unlogSet } from "@/lib/actions/workout";
import { muscleLabel } from "@/lib/exercises";
import type { LoggedSet, Suggestion } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { formatRest } from "@/lib/validations-workout";

export type PlayerItem = {
  id: string;
  sets: number;
  reps: string;
  loadKg: number | null;
  restSeconds: number;
  notes: string | null;
  /** Alvo de repetições na reserva definido pelo treinador (null = sem alvo). */
  targetRir: number | null;
  /** Última sessão concluída deste exercício (qualquer plano). */
  last: { date: string; sets: LoggedSet[] } | null;
  suggestion: Suggestion | null;
  exercise: {
    name: string;
    muscleGroup: string;
    instructions: string | null;
    sourceId: string | null;
    imageUrl: string | null;
    imageUrlEnd: string | null;
    videoUrl: string | null;
  };
  done: { setNumber: number; reps: number | null; loadKg: number | null; rir: number | null }[];
};

type SetState = { reps: string; load: string; done: boolean; rir: number | null };

const RIR_OPTIONS = [0, 1, 2, 3, 4];
const kgFmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const dayFmt = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

/** Seletor de RIR: quantas repetições ainda daria (0 = falha). */
function RirPicker({ value, target, onPick, size = "sm" }: { value: number | null; target: number | null; onPick: (r: number) => void; size?: "sm" | "lg" }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Repetições na reserva (RIR)">
      {RIR_OPTIONS.map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={value === r}
          onClick={() => onPick(r)}
          className={cn(
            "rounded-full border tabular-nums transition-all",
            size === "lg" ? "h-12 min-w-12 px-3 text-lg" : "h-7 min-w-8 px-2 text-xs",
            value === r ? "glow border-transparent bg-orange text-black" : target === r ? "border-orange/50 text-orange" : "border-white/10 text-chumbo-100/70 hover:border-white/30",
          )}
        >
          {r === 4 ? "4+" : r}
        </button>
      ))}
    </div>
  );
}

const clock = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Primeiro número de "8-12" / "10" para pré-preencher as repetições. */
const targetReps = (reps: string) => reps.match(/\d+/)?.[0] ?? "";

// ─── Som e vibração ───────────────────────────────────────

function useBeeper() {
  const ctx = useRef<AudioContext | null>(null);
  // O navegador só libera áudio depois de um toque do usuário: chamamos unlock() nos botões.
  const unlock = useCallback(() => {
    if (!ctx.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx.current = new AC();
    }
    void ctx.current?.resume();
  }, []);
  const beep = useCallback((freq = 880, ms = 140, delay = 0) => {
    const ac = ctx.current;
    if (!ac) return;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  }, []);
  const alarm = useCallback(() => {
    [0, 0.22, 0.44].forEach((d) => beep(1175, 180, d));
    navigator.vibrate?.([250, 120, 250, 120, 400]);
  }, [beep]);
  return { unlock, beep, alarm };
}

/** Mantém a tela acesa durante o treino (quando o navegador suporta). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        /* sem suporte ou bateria baixa: segue sem */
      }
    };
    void acquire();
    const onVisible = () => document.visibilityState === "visible" && void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);
}

/** Força re-render a cada `ms` (cronômetros baseados em timestamp, resistentes a aba em segundo plano). */
function useTick(ms = 250) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

// ─── Player ───────────────────────────────────────────────

export function WorkoutPlayer({
  dayId,
  initialSession,
  dayName,
  items,
}: {
  dayId: string;
  initialSession: { id: string; startedAt: string } | null;
  dayName: string;
  items: PlayerItem[];
}) {
  const router = useRouter();
  const { unlock, beep, alarm } = useBeeper();
  useWakeLock();
  useTick();

  const [index, setIndex] = useState(() => {
    const firstOpen = items.findIndex((it) => it.done.length < it.sets);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [sets, setSets] = useState<Record<string, SetState[]>>(() =>
    Object.fromEntries(
      items.map((it) => [
        it.id,
        Array.from({ length: it.sets }, (_, i) => {
          const d = it.done.find((x) => x.setNumber === i + 1);
          // Carga: a registrada > a sugerida pelo histórico > a prescrita no plano
          const load = d?.loadKg ?? it.suggestion?.loadKg ?? it.loadKg;
          return {
            reps: d?.reps != null ? String(d.reps) : it.suggestion?.reps != null ? String(it.suggestion.reps) : targetReps(it.reps),
            load: load != null ? String(load).replace(".", ",") : "",
            done: !!d,
            rir: d?.rir ?? null,
          };
        }),
      ]),
    ),
  );

  // Descanso: guardamos o instante final, não um contador (não atrasa com a tela bloqueada).
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(0);
  const lastBeep = useRef<number | null>(null);
  // Cronômetro da série atual (pausável)
  const [setClock, setSetClock] = useState<{ start: number | null; acc: number }>({ start: null, acc: 0 });
  const [frame, setFrame] = useState<0 | 1>(0);
  const [pending, startTransition] = useTransition();
  const [session, setSession] = useState(initialSession);
  // Espelho do estado para callbacks assíncronos (RIR escolhido enquanto a série ainda está sendo salva)
  const setsRef = useRef(sets);
  useEffect(() => {
    setsRef.current = sets;
  }, [sets]);
  // Última série concluída: o aluno avalia o RIR dela durante o descanso
  const [lastDone, setLastDone] = useState<{ itemId: string; i: number } | null>(null);
  const sessionRef = useRef(initialSession?.id ?? null);

  /** Cria a sessão no primeiro registro de série (ou retoma a aberta). */
  async function ensureSession() {
    if (sessionRef.current) return sessionRef.current;
    const r = await startSession(dayId);
    if (!r.ok || !r.sessionId) throw new Error(r.ok ? "Falha ao iniciar" : r.error);
    sessionRef.current = r.sessionId;
    setSession({ id: r.sessionId, startedAt: new Date().toISOString() });
    return r.sessionId;
  }

  const item = items[index];
  const itemSets = sets[item.id];
  const totalSets = items.reduce((n, it) => n + it.sets, 0);
  const doneSets = Object.values(sets).reduce((n, arr) => n + arr.filter((s) => s.done).length, 0);
  const now = Date.now();
  const elapsed = session ? (now - new Date(session.startedAt).getTime()) / 1000 : 0;
  const restLeft = restEnd ? Math.max(0, (restEnd - now) / 1000) : 0;
  const setElapsed = (setClock.acc + (setClock.start ? now - setClock.start : 0)) / 1000;

  // Alterna posição inicial/final da foto (efeito de "animação" do movimento)
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1400);
    return () => clearInterval(id);
  }, []);

  // Bipes nos 3 últimos segundos e alarme no fim do descanso
  useEffect(() => {
    if (!restEnd) return;
    const id = setInterval(() => {
      const left = (restEnd - Date.now()) / 1000;
      const whole = Math.ceil(left);
      if (whole !== lastBeep.current && whole <= 3 && whole > 0) {
        lastBeep.current = whole;
        beep(660, 110);
      }
      if (left <= 0) {
        clearInterval(id);
        alarm();
        lastBeep.current = null;
        setRestEnd(null);
        setSetClock({ start: Date.now(), acc: 0 });
        toast("Descanso encerrado — próxima série!");
      }
    }, 200);
    return () => clearInterval(id);
  }, [restEnd, beep, alarm]);

  const updateFor = (itemId: string, i: number, patch: Partial<SetState>) =>
    setSets((prev) => ({ ...prev, [itemId]: prev[itemId].map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  const update = (i: number, patch: Partial<SetState>) => updateFor(item.id, i, patch);

  function rate(itemId: string, i: number, rir: number) {
    const before = sets[itemId][i].rir;
    updateFor(itemId, i, { rir });
    startTransition(async () => {
      if (!sessionRef.current) return;
      const r = await rateSet(sessionRef.current, itemId, i + 1, rir);
      if (!r.ok) {
        updateFor(itemId, i, { rir: before });
        toast.error(r.error);
      }
    });
  }

  const num = (v: string) => {
    const n = Number(v.replace(",", "."));
    return v.trim() === "" || Number.isNaN(n) ? null : n;
  };

  function toggleSet(i: number) {
    unlock();
    const s = itemSets[i];
    if (s.done) {
      update(i, { done: false });
      startTransition(async () => {
        if (!sessionRef.current) return;
        const r = await unlogSet(sessionRef.current, item.id, i + 1);
        if (!r.ok) {
          update(i, { done: true });
          toast.error(r.error);
        }
      });
      return;
    }
    const reps = num(s.reps);
    const load = num(s.load);
    update(i, { done: true });
    setLastDone({ itemId: item.id, i });
    startTransition(async () => {
      let sessionId: string;
      try {
        sessionId = await ensureSession();
      } catch (err) {
        update(i, { done: false });
        toast.error(err instanceof Error ? err.message : "Falha ao iniciar o treino");
        return;
      }
      const r = await logSet({ sessionId, itemId: item.id, setNumber: i + 1, reps: reps == null ? null : Math.round(reps), loadKg: load });
      if (!r.ok) {
        update(i, { done: false });
        toast.error(r.error);
        return;
      }
      // RIR escolhido antes do registro chegar ao servidor
      const rir = setsRef.current[item.id][i].rir;
      if (rir != null) await rateSet(sessionId, item.id, i + 1, rir);
    });
    const isLastSetOfLastItem = index === items.length - 1 && itemSets.filter((x) => x.done).length + 1 === item.sets;
    if (item.restSeconds > 0 && !isLastSetOfLastItem) {
      setRestTotal(item.restSeconds);
      setRestEnd(Date.now() + item.restSeconds * 1000);
      lastBeep.current = null;
    }
    setSetClock({ start: null, acc: 0 });
    // Todas as séries feitas: avança para o próximo exercício
    if (itemSets.filter((x) => x.done).length + 1 === item.sets && index < items.length - 1) {
      setIndex(index + 1);
    }
  }

  function finish() {
    unlock();
    startTransition(async () => {
      // Nada registrado: só sai, sem criar sessão vazia
      if (!sessionRef.current) {
        router.push("/aluno/treino");
        return;
      }
      const r = await finishSession(sessionRef.current);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Treino concluído. Bom trabalho!");
      router.push("/aluno/treino");
    });
  }

  const progress = totalSets ? doneSets / totalSets : 0;
  const allDone = doneSets === totalSets;
  const nextUp = useMemo(() => items[index + 1]?.exercise.name, [items, index]);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="label-mono">Treino em andamento</p>
          <h1 className="truncate text-xl font-semibold tracking-tight">{dayName}</h1>
        </div>
        <Ring value={progress} size={64} stroke={6}>
          <span className="text-xs font-medium tabular-nums">
            {doneSets}/{totalSets}
          </span>
        </Ring>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-4">
          <p className="label-mono">Tempo total</p>
          <p className="num-thin mt-2 text-4xl">{clock(elapsed)}</p>
        </div>
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <p className="label-mono">Série atual</p>
            <button
              type="button"
              onClick={() =>
                setSetClock((c) => (c.start ? { start: null, acc: c.acc + (Date.now() - c.start) } : { start: Date.now(), acc: c.acc }))
              }
              className="text-chumbo-100/70 hover:text-white"
              aria-label={setClock.start ? "Pausar cronômetro da série" : "Retomar cronômetro da série"}
            >
              {setClock.start ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </div>
          <p className={cn("num-thin mt-2 text-4xl", setClock.start && "text-orange")}>{clock(setElapsed)}</p>
        </div>
      </div>

      {/* Exercício atual */}
      <section className="glass overflow-hidden rounded-[2rem]">
        <ExerciseImage
          name={item.exercise.name}
          imageUrl={item.exercise.imageUrl}
          imageUrlEnd={item.exercise.imageUrlEnd}
          videoUrl={item.exercise.videoUrl}
          sourceId={item.exercise.sourceId}
          frame={frame}
          className="aspect-[4/3] rounded-none"
        />
        <div className="flex flex-col gap-4 p-5">
          <div>
            <p className="label-mono">
              Exercício {index + 1}/{items.length} · {muscleLabel(item.exercise.muscleGroup)}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{item.exercise.name}</h2>
            <p className="mt-1 text-sm text-chumbo-100/80">
              {item.sets} × {item.reps}
              {item.loadKg != null && ` · ${item.loadKg} kg`} · descanso {formatRest(item.restSeconds)}
            </p>
            {item.targetRir != null && (
              <p className="mt-2 inline-flex rounded-full border border-orange/40 px-2.5 py-0.5 text-xs text-orange">
                Alvo: {item.targetRir === 4 ? "RIR 4+" : `RIR ${item.targetRir}`} · RPE {10 - item.targetRir} — pare com {item.targetRir} rep{item.targetRir === 1 ? "" : "s"} sobrando
              </p>
            )}
            {item.notes && <p className="mt-2 rounded-2xl bg-orange/10 px-3 py-2 text-sm text-orange-bright">{item.notes}</p>}
            {item.last && (
              <div className="mt-3 flex flex-col gap-1.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-sm">
                <p className="flex items-center gap-2 text-chumbo-100/70">
                  <History className="size-4" /> Última vez · {dayFmt(item.last.date)}
                </p>
                <p className="tabular-nums">
                  {item.last.sets
                    .map((x) => `${x.loadKg != null ? `${kgFmt(x.loadKg)} kg` : "—"} × ${x.reps ?? "—"}${x.rir != null ? ` (RIR ${x.rir})` : ""}`)
                    .join(" · ")}
                </p>
                {item.suggestion && (
                  <p className="flex items-start gap-2 text-orange">
                    <TrendingUp className="mt-0.5 size-4 shrink-0" /> {item.suggestion.text}
                  </p>
                )}
              </div>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {itemSets.map((s, i) => (
              <li
                key={i}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-white/5 bg-white/[0.03] p-2 pl-4 transition-colors",
                  s.done && "border-orange/30 bg-orange/10",
                )}
              >
                <span className="w-10 text-sm text-chumbo-100/70 tabular-nums">#{i + 1}</span>
                <label className="flex flex-1 items-center gap-1.5">
                  <input
                    inputMode="numeric"
                    value={s.reps}
                    onChange={(e) => update(i, { reps: e.target.value })}
                    disabled={s.done}
                    className="w-12 rounded-lg bg-transparent py-1 text-center text-lg tabular-nums outline-none focus:bg-white/5 disabled:opacity-80"
                    aria-label={`Repetições da série ${i + 1}`}
                  />
                  <span className="text-xs text-chumbo-100/60">reps</span>
                </label>
                <label className="flex flex-1 items-center gap-1.5">
                  <input
                    inputMode="decimal"
                    value={s.load}
                    onChange={(e) => update(i, { load: e.target.value })}
                    disabled={s.done}
                    placeholder="—"
                    className="w-14 rounded-lg bg-transparent py-1 text-center text-lg tabular-nums outline-none focus:bg-white/5 disabled:opacity-80"
                    aria-label={`Carga da série ${i + 1} em kg`}
                  />
                  <span className="text-xs text-chumbo-100/60">kg</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleSet(i)}
                  disabled={pending}
                  className={cn(
                    "grid size-11 place-items-center rounded-xl border border-white/10 transition-all",
                    s.done ? "glow border-transparent bg-orange text-black" : "hover:border-orange/60 hover:text-orange",
                  )}
                  aria-label={s.done ? `Desmarcar série ${i + 1}` : `Concluir série ${i + 1}`}
                >
                  <Check className="size-5" />
                </button>
                {s.done && (
                  <div className="flex w-full items-center justify-between gap-2 pr-2 pb-1">
                    <span className="text-[0.65rem] tracking-[0.12em] text-chumbo-100/60 uppercase">Sobrou (RIR)</span>
                    <RirPicker value={s.rir} target={item.targetRir} onPick={(r) => rate(item.id, i, r)} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          {item.exercise.instructions && (
            <details className="group text-sm text-chumbo-100/80">
              <summary className="cursor-pointer list-none label-mono hover:text-white">Como executar ↓</summary>
              <p className="mt-2 leading-relaxed">{item.exercise.instructions}</p>
            </details>
          )}
        </div>
      </section>

      {/* Controles (anterior / descanso manual / próximo) */}
      <div className="glass grid grid-cols-3 overflow-hidden rounded-3xl">
        <button
          type="button"
          onClick={() => index > 0 && setIndex(index - 1)}
          disabled={index === 0}
          className="flex h-16 items-center justify-center border-r border-white/5 hover:bg-white/5 disabled:opacity-30"
          aria-label="Exercício anterior"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => {
            unlock();
            setRestTotal(item.restSeconds || 60);
            setRestEnd(Date.now() + (item.restSeconds || 60) * 1000);
          }}
          className="flex h-16 items-center justify-center gap-2 border-r border-white/5 text-sm hover:bg-white/5"
        >
          <Timer className="size-5" /> Descanso
        </button>
        <button
          type="button"
          onClick={() => index < items.length - 1 && setIndex(index + 1)}
          disabled={index === items.length - 1}
          className="flex h-16 items-center justify-center hover:bg-white/5 disabled:opacity-30"
          aria-label="Próximo exercício"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      {nextUp && <p className="text-center text-sm text-chumbo-100/60">A seguir: {nextUp}</p>}

      <button
        type="button"
        onClick={finish}
        disabled={pending}
        className={cn(
          "h-14 rounded-full font-mono text-sm uppercase tracking-[0.14em] transition-all",
          allDone ? "glow bg-orange text-black" : "border border-white/10 text-chumbo-100 hover:border-white/30",
        )}
      >
        {allDone ? "Finalizar treino" : "Encerrar treino agora"}
      </button>

      {/* Descanso em tela cheia */}
      {restEnd && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/90 px-6 backdrop-blur-xl" role="dialog" aria-label="Descanso">
          <p className="label-mono !text-orange">Descanso</p>
          <Ring value={restTotal ? restLeft / restTotal : 0} size={260} stroke={14}>
            <span className="num-dot text-7xl">{clock(Math.ceil(restLeft))}</span>
          </Ring>
          {lastDone && sets[lastDone.itemId] && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-center text-sm">
                Quantas repetições ainda daria na série que acabou?
                {(() => {
                  const t = items.find((x) => x.id === lastDone.itemId)?.targetRir;
                  return t != null ? <span className="block text-xs text-orange">Alvo: {t === 4 ? "4+" : t}</span> : null;
                })()}
              </p>
              <RirPicker
                size="lg"
                value={sets[lastDone.itemId][lastDone.i].rir}
                target={items.find((x) => x.id === lastDone.itemId)?.targetRir ?? null}
                onPick={(r) => rate(lastDone.itemId, lastDone.i, r)}
              />
              <p className="text-[0.65rem] tracking-[0.12em] text-chumbo-100/50 uppercase">0 = falha · RPE = 10 − RIR</p>
            </div>
          )}
          <p className="text-center text-sm text-chumbo-100/70">
            Próximo: {itemSets.every((s) => s.done) ? (nextUp ?? "fim do treino") : `${item.exercise.name} · série ${itemSets.filter((s) => s.done).length + 1}`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRestEnd((e) => (e ? Math.max(Date.now() + 1000, e - 15000) : e))}
              className="glass grid size-14 place-items-center rounded-full"
              aria-label="Menos 15 segundos"
            >
              <Minus className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setRestEnd(null);
                setSetClock({ start: Date.now(), acc: 0 });
              }}
              className="glow flex h-14 items-center gap-2 rounded-full bg-orange px-7 font-mono text-sm uppercase tracking-[0.14em] text-black"
            >
              <SkipForward className="size-4" /> Pular
            </button>
            <button
              type="button"
              onClick={() => {
                setRestEnd((e) => (e ? e + 15000 : e));
                setRestTotal((t) => t + 15);
              }}
              className="glass grid size-14 place-items-center rounded-full"
              aria-label="Mais 15 segundos"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <button type="button" onClick={() => setRestEnd(null)} className="absolute top-6 right-6 text-chumbo-100/60 hover:text-white" aria-label="Fechar descanso">
            <X className="size-6" />
          </button>
        </div>
      )}
    </div>
  );
}
