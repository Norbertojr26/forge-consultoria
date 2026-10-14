"use client";

import { ArrowDown, ArrowUp, Pill, Plus, Save, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveDiet } from "@/lib/actions/diet";
import { sumMacros } from "@/lib/diet";
import { cn } from "@/lib/utils";

type Item = { key: string; food: string; quantity: string; kcal: string; proteinG: string; carbsG: string; fatG: string; substitutions: string };
type MealState = { key: string; name: string; time: string; notes: string; items: Item[] };
type SuppState = { key: string; kind: "SUPPLEMENT" | "MEDICATION"; name: string; dose: string; times: string[]; notes: string };

export type EditorDiet = {
  planId: string | null;
  name: string;
  notes: string;
  kcalTarget: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  waterGoalMl: number | null;
  meals: {
    name: string;
    time: string | null;
    notes: string | null;
    items: { food: string; quantity: string; kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; substitutions: string | null }[];
  }[];
  supplements: { kind: "SUPPLEMENT" | "MEDICATION"; name: string; dose: string; times: string[]; notes: string | null }[];
};

const uid = () => Math.random().toString(36).slice(2, 10);
const str = (n: number | null) => (n == null ? "" : String(n));
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none transition-colors focus:border-orange/60";
const MEAL_PRESETS: [string, string][] = [
  ["Café da manhã", "07:00"],
  ["Lanche da manhã", "10:00"],
  ["Almoço", "12:30"],
  ["Lanche da tarde", "16:00"],
  ["Pré-treino", "17:30"],
  ["Jantar", "20:00"],
  ["Ceia", "22:30"],
];
const emptyItem = (): Item => ({ key: uid(), food: "", quantity: "", kcal: "", proteinG: "", carbsG: "", fatG: "", substitutions: "" });

export function DietEditor({ studentId, initial, weightKg }: { studentId: string; initial: EditorDiet; weightKg: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [planId, setPlanId] = useState(initial.planId);
  const [name, setName] = useState(initial.name);
  const [notes, setNotes] = useState(initial.notes);
  const [targets, setTargets] = useState({
    kcalTarget: str(initial.kcalTarget),
    proteinG: str(initial.proteinG),
    carbsG: str(initial.carbsG),
    fatG: str(initial.fatG),
    waterGoalMl: str(initial.waterGoalMl),
  });
  const [meals, setMeals] = useState<MealState[]>(() =>
    initial.meals.map((m) => ({
      key: uid(),
      name: m.name,
      time: m.time ?? "",
      notes: m.notes ?? "",
      items: m.items.map((it) => ({
        key: uid(),
        food: it.food,
        quantity: it.quantity,
        kcal: str(it.kcal),
        proteinG: str(it.proteinG),
        carbsG: str(it.carbsG),
        fatG: str(it.fatG),
        substitutions: it.substitutions ?? "",
      })),
    })),
  );
  const [supps, setSupps] = useState<SuppState[]>(() =>
    initial.supplements.map((s) => ({ key: uid(), kind: s.kind, name: s.name, dose: s.dose, times: s.times, notes: s.notes ?? "" })),
  );
  const [dirty, setDirty] = useState(false);
  const touch = () => setDirty(true);

  const updateMeal = (key: string, patch: Partial<MealState>) => {
    setMeals((ms) => ms.map((m) => (m.key === key ? { ...m, ...patch } : m)));
    touch();
  };
  const updateItem = (mealKey: string, itemKey: string, patch: Partial<Item>) => {
    setMeals((ms) => ms.map((m) => (m.key === mealKey ? { ...m, items: m.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)) } : m)));
    touch();
  };
  const moveMeal = (i: number, dir: -1 | 1) => {
    setMeals((ms) => {
      const j = i + dir;
      if (j < 0 || j >= ms.length) return ms;
      const next = [...ms];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    touch();
  };
  const updateSupp = (key: string, patch: Partial<SuppState>) => {
    setSupps((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    touch();
  };

  const allItems = meals.flatMap((m) => m.items).map((it) => ({ kcal: num(it.kcal), proteinG: num(it.proteinG), carbsG: num(it.carbsG), fatG: num(it.fatG) }));
  const total = sumMacros(allItems);
  const waterHint = weightKg ? Math.round((weightKg * 35) / 50) * 50 : 2500;

  function save() {
    start(async () => {
      const r = await saveDiet({
        planId,
        studentId,
        name,
        notes: notes.trim() || null,
        kcalTarget: num(targets.kcalTarget),
        proteinG: num(targets.proteinG),
        carbsG: num(targets.carbsG),
        fatG: num(targets.fatG),
        waterGoalMl: num(targets.waterGoalMl),
        meals: meals.map((m) => ({
          name: m.name,
          time: m.time || null,
          notes: m.notes.trim() || null,
          items: m.items.map((it) => ({
            food: it.food,
            quantity: it.quantity,
            kcal: num(it.kcal),
            proteinG: num(it.proteinG),
            carbsG: num(it.carbsG),
            fatG: num(it.fatG),
            substitutions: it.substitutions.trim() || null,
          })),
        })),
        supplements: supps.map((s) => ({ kind: s.kind, name: s.name, dose: s.dose, times: s.times, notes: s.notes.trim() || null })),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success("Dieta salva");
      if (!planId && r.planId) {
        setPlanId(r.planId);
        router.replace(`/treinador/alunos/${studentId}/dieta/${r.planId}`);
      }
      router.refresh();
    });
  }

  const target = (key: keyof typeof targets, label: string, unit: string, placeholder?: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="label-mono">{label}</span>
      <div className="relative">
        <input
          inputMode="numeric"
          value={targets[key]}
          placeholder={placeholder}
          onChange={(e) => {
            setTargets((t) => ({ ...t, [key]: e.target.value }));
            touch();
          }}
          className={cn(inputCls, "pr-10")}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-chumbo-100/50">{unit}</span>
      </div>
    </label>
  );

  const bar = (label: string, value: number, goal: string, unit: string) => {
    const g = num(goal);
    const pct = g ? Math.min(1.2, value / g) : 0;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="label-mono">{label}</span>
          <span className="text-xs tabular-nums text-chumbo-100/70">
            {Math.round(value)}
            {g ? ` / ${g}` : ""} {unit}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn("h-full rounded-full transition-all", pct > 1.05 ? "bg-red-400" : "bg-orange shadow-[0_0_12px_rgb(255_91_20/0.6)]")}
            style={{ width: `${Math.min(100, pct * 100)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-28">
      <section className="glass flex flex-col gap-4 rounded-3xl p-5">
        <label className="flex flex-col gap-1.5">
          <span className="label-mono">Nome da dieta</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              touch();
            }}
            placeholder="Ex.: Cutting — fase 1"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-mono">Orientações gerais</span>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              touch();
            }}
            rows={2}
            placeholder="Ex.: pese os alimentos cozidos; temperos à vontade, sem açúcar."
            className={inputCls}
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {target("kcalTarget", "Meta kcal", "kcal")}
          {target("proteinG", "Proteína", "g")}
          {target("carbsG", "Carboidrato", "g")}
          {target("fatG", "Gordura", "g")}
          {target("waterGoalMl", "Água / dia", "ml", `${waterHint}`)}
        </div>
        <p className="text-xs text-chumbo-100/50">
          Água em branco = 35 ml por kg do último peso do aluno ({(waterHint / 1000).toLocaleString("pt-BR")} L hoje).
        </p>
      </section>

      {/* Refeições */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="label-mono flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-orange" /> Refeições
          </h2>
        </div>
        {meals.map((meal, mi) => {
          const sub = sumMacros(meal.items.map((it) => ({ kcal: num(it.kcal), proteinG: num(it.proteinG), carbsG: num(it.carbsG), fatG: num(it.fatG) })));
          return (
            <div key={meal.key} className="glass flex flex-col gap-3 rounded-3xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={meal.time}
                  onChange={(e) => updateMeal(meal.key, { time: e.target.value })}
                  className={cn(inputCls, "w-32")}
                  aria-label="Horário"
                />
                <input
                  value={meal.name}
                  onChange={(e) => updateMeal(meal.key, { name: e.target.value })}
                  className={cn(inputCls, "min-w-40 flex-1 font-medium")}
                  aria-label="Nome da refeição"
                />
                <span className="text-xs tabular-nums text-chumbo-100/60">
                  {Math.round(sub.kcal)} kcal · P {Math.round(sub.proteinG)} · C {Math.round(sub.carbsG)} · G {Math.round(sub.fatG)}
                </span>
                <div className="ml-auto flex gap-1">
                  <button type="button" onClick={() => moveMeal(mi, -1)} className="p-1.5 text-chumbo-100/50 hover:text-white" aria-label="Subir refeição">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => moveMeal(mi, 1)} className="p-1.5 text-chumbo-100/50 hover:text-white" aria-label="Descer refeição">
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMeals((ms) => ms.filter((m) => m.key !== meal.key));
                      touch();
                    }}
                    className="p-1.5 text-chumbo-100/50 hover:text-red-400"
                    aria-label="Remover refeição"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="hidden grid-cols-[2fr_1fr_repeat(4,0.7fr)_2fr_auto] gap-2 px-1 text-[0.6rem] tracking-[0.12em] text-chumbo-100/50 uppercase md:grid">
                <span>Alimento</span>
                <span>Qtd.</span>
                <span>kcal</span>
                <span>P (g)</span>
                <span>C (g)</span>
                <span>G (g)</span>
                <span>Substituição</span>
                <span className="w-7" />
              </div>
              {meal.items.map((it) => (
                <div key={it.key} className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.02] p-2 md:grid-cols-[2fr_1fr_repeat(4,0.7fr)_2fr_auto] md:bg-transparent md:p-0">
                  <input value={it.food} onChange={(e) => updateItem(meal.key, it.key, { food: e.target.value })} placeholder="Alimento" className={cn(inputCls, "col-span-2 md:col-span-1")} />
                  <input value={it.quantity} onChange={(e) => updateItem(meal.key, it.key, { quantity: e.target.value })} placeholder="150 g" className={inputCls} />
                  <input inputMode="numeric" value={it.kcal} onChange={(e) => updateItem(meal.key, it.key, { kcal: e.target.value })} placeholder="kcal" className={inputCls} />
                  <input inputMode="decimal" value={it.proteinG} onChange={(e) => updateItem(meal.key, it.key, { proteinG: e.target.value })} placeholder="P" className={inputCls} />
                  <input inputMode="decimal" value={it.carbsG} onChange={(e) => updateItem(meal.key, it.key, { carbsG: e.target.value })} placeholder="C" className={inputCls} />
                  <input inputMode="decimal" value={it.fatG} onChange={(e) => updateItem(meal.key, it.key, { fatG: e.target.value })} placeholder="G" className={inputCls} />
                  <input value={it.substitutions} onChange={(e) => updateItem(meal.key, it.key, { substitutions: e.target.value })} placeholder="ou batata-doce 200 g" className={cn(inputCls, "col-span-2 md:col-span-1")} />
                  <button
                    type="button"
                    onClick={() => updateMeal(meal.key, { items: meal.items.filter((x) => x.key !== it.key) })}
                    className="justify-self-end p-1.5 text-chumbo-100/50 hover:text-red-400"
                    aria-label="Remover alimento"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateMeal(meal.key, { items: [...meal.items, emptyItem()] })}
                  className="flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:border-orange/50"
                >
                  <Plus className="size-3.5" /> Alimento
                </button>
                <input
                  value={meal.notes}
                  onChange={(e) => updateMeal(meal.key, { notes: e.target.value })}
                  placeholder="Observação da refeição (opcional)"
                  className={cn(inputCls, "min-w-48 flex-1")}
                />
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          {MEAL_PRESETS.filter(([n]) => !meals.some((m) => m.name === n)).map(([n, t]) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setMeals((ms) => [...ms, { key: uid(), name: n, time: t, notes: "", items: [emptyItem()] }].sort((a, b) => (a.time || "99").localeCompare(b.time || "99")));
                touch();
              }}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-chumbo-100/80 hover:border-orange/60 hover:text-white"
            >
              <Plus className="size-3.5" /> {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMeals((ms) => [...ms, { key: uid(), name: "Refeição", time: "", notes: "", items: [emptyItem()] }]);
              touch();
            }}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-chumbo-100/80 hover:border-orange/60 hover:text-white"
          >
            <Plus className="size-3.5" /> Outra refeição
          </button>
        </div>
      </section>

      {/* Suplementos e medicações */}
      <section className="flex flex-col gap-3">
        <h2 className="label-mono flex items-center gap-2">
          <Pill className="size-4 text-orange" /> Suplementos e medicações
        </h2>
        {supps.map((s) => (
          <div key={s.key} className="glass flex flex-col gap-3 rounded-3xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-white/10 p-0.5 text-xs">
                {(["SUPPLEMENT", "MEDICATION"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => updateSupp(s.key, { kind: k })}
                    className={cn("rounded-full px-3 py-1", s.kind === k ? "bg-white/10 text-white" : "text-chumbo-100/60")}
                  >
                    {k === "SUPPLEMENT" ? "Suplemento" : "Medicação"}
                  </button>
                ))}
              </div>
              <input value={s.name} onChange={(e) => updateSupp(s.key, { name: e.target.value })} placeholder="Nome (ex.: Creatina)" className={cn(inputCls, "min-w-40 flex-1")} />
              <input value={s.dose} onChange={(e) => updateSupp(s.key, { dose: e.target.value })} placeholder="Dose (ex.: 5 g)" className={cn(inputCls, "w-32")} />
              <button
                type="button"
                onClick={() => {
                  setSupps((ss) => ss.filter((x) => x.key !== s.key));
                  touch();
                }}
                className="p-1.5 text-chumbo-100/50 hover:text-red-400"
                aria-label="Remover"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono">Horários</span>
              {s.times.map((t, ti) => (
                <span key={ti} className="flex items-center gap-1 rounded-full bg-white/[0.06] py-1 pr-1 pl-1">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => updateSupp(s.key, { times: s.times.map((x, xi) => (xi === ti ? e.target.value : x)) })}
                    className="w-28 bg-transparent px-2 text-sm outline-none"
                    aria-label="Horário da dose"
                  />
                  <button type="button" onClick={() => updateSupp(s.key, { times: s.times.filter((_, xi) => xi !== ti) })} className="p-1 text-chumbo-100/50 hover:text-white" aria-label="Remover horário">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => updateSupp(s.key, { times: [...s.times, "08:00"] })} className="flex items-center gap-1 rounded-full border border-dashed border-white/15 px-3 py-1 text-xs hover:border-orange/60">
                <Plus className="size-3.5" /> horário
              </button>
              <input value={s.notes} onChange={(e) => updateSupp(s.key, { notes: e.target.value })} placeholder="Observação (ex.: com água, em jejum)" className={cn(inputCls, "min-w-48 flex-1")} />
            </div>
            {s.kind === "MEDICATION" && (
              <p className="text-xs text-orange/90">Medicação aparece para o aluno só como lembrete do que foi prescrito pelo médico dele.</p>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSupps((ss) => [...ss, { key: uid(), kind: "SUPPLEMENT", name: "", dose: "", times: ["08:00"], notes: "" }]);
              touch();
            }}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-chumbo-100/80 hover:border-orange/60 hover:text-white"
          >
            <Plus className="size-3.5" /> Suplemento
          </button>
          <button
            type="button"
            onClick={() => {
              setSupps((ss) => [...ss, { key: uid(), kind: "MEDICATION", name: "", dose: "", times: ["08:00"], notes: "" }]);
              touch();
            }}
            className="flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-3 py-1.5 text-xs text-chumbo-100/80 hover:border-orange/60 hover:text-white"
          >
            <Plus className="size-3.5" /> Medicação
          </button>
        </div>
      </section>

      {/* Barra fixa: totais x metas + salvar */}
      <div className="glass fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-5xl flex-wrap items-center gap-4 rounded-3xl px-5 py-3 md:flex-nowrap">
        <div className="grid flex-1 grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
          {bar("kcal", total.kcal, targets.kcalTarget, "kcal")}
          {bar("Proteína", total.proteinG, targets.proteinG, "g")}
          {bar("Carbo", total.carbsG, targets.carbsG, "g")}
          {bar("Gordura", total.fatG, targets.fatG, "g")}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="glow flex h-11 shrink-0 items-center gap-2 rounded-full bg-orange px-6 font-mono text-xs uppercase tracking-[0.14em] text-black disabled:opacity-60"
        >
          <Save className="size-4" /> {pending ? "Salvando…" : dirty || !planId ? "Salvar dieta" : "Salvo"}
        </button>
      </div>
    </div>
  );
}
