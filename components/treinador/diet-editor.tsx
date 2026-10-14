"use client";

import { ArrowDown, ArrowUp, Library, Pill, Plus, Save, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { type CatalogFood, FoodField } from "@/components/treinador/food-field";
import { saveDiet } from "@/lib/actions/diet";
import { saveTemplate } from "@/lib/actions/foods";
import { sumMacros } from "@/lib/diet";
import { commonTags, FOOD_TAGS, type FoodTag, scaleMacros, type TemplateContent, tagLabel } from "@/lib/foods";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  food: string;
  foodId: string | null;
  grams: string;
  quantity: string;
  kcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  substitutions: string;
};
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
    items: {
      food: string;
      quantity: string;
      kcal: number | null;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
      substitutions: string | null;
      foodId?: string | null;
      grams?: number | null;
    }[];
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
const emptyItem = (): Item => ({ key: uid(), food: "", foodId: null, grams: "", quantity: "", kcal: "", proteinG: "", carbsG: "", fatG: "", substitutions: "" });

/** Kit disponível para aplicar numa dieta. */
export type KitOption = { id: string; name: string; description: string | null; tags: string[]; content: TemplateContent };

type Mode =
  | { mode: "diet"; studentId: string; weightKg: number | null; kits: KitOption[] }
  | { mode: "template"; templateId: string | null; description: string; tags: string[] };

const toState = (initial: Pick<EditorDiet, "meals" | "supplements">) => ({
  meals: initial.meals.map((m) => ({
    key: uid(),
    name: m.name,
    time: m.time ?? "",
    notes: m.notes ?? "",
    items: m.items.map((it) => ({
      key: uid(),
      food: it.food,
      foodId: it.foodId ?? null,
      grams: str(it.grams ?? null),
      quantity: it.quantity,
      kcal: str(it.kcal),
      proteinG: str(it.proteinG),
      carbsG: str(it.carbsG),
      fatG: str(it.fatG),
      substitutions: it.substitutions ?? "",
    })),
  })),
  supps: initial.supplements.map((s) => ({ key: uid(), kind: s.kind, name: s.name, dose: s.dose, times: s.times, notes: s.notes ?? "" })),
});

export function DietEditor(props: { initial: EditorDiet; foods: CatalogFood[] } & Mode) {
  const { initial, foods } = props;
  const isTemplate = props.mode === "template";
  const weightKg = props.mode === "diet" ? props.weightKg : null;
  const foodById = new Map(foods.map((f) => [f.id, f]));
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
  const [meals, setMeals] = useState<MealState[]>(() => toState(initial).meals);
  const [supps, setSupps] = useState<SuppState[]>(() => toState(initial).supps as SuppState[]);
  const [description, setDescription] = useState(props.mode === "template" ? props.description : "");
  const [tags, setTags] = useState<FoodTag[]>(props.mode === "template" ? (props.tags as FoodTag[]) : []);
  const [templateId, setTemplateId] = useState(props.mode === "template" ? props.templateId : null);
  const [kitPicker, setKitPicker] = useState(false);
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

  /** Metas, refeições e suplementos no formato do servidor (dieta e kit usam o mesmo). */
  function content(): TemplateContent {
    return {
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
          foodId: it.foodId,
          grams: it.foodId ? num(it.grams) : null,
        })),
      })),
      supplements: supps.map((s) => ({ kind: s.kind, name: s.name, dose: s.dose, times: s.times, notes: s.notes.trim() || null })),
    };
  }

  // Etiquetas que todos os alimentos do banco usados aqui têm (itens livres não contam)
  const linkedTags = meals.flatMap((m) => m.items).flatMap((it) => (it.foodId && foodById.get(it.foodId) ? [foodById.get(it.foodId)!.tags] : []));
  const safeTags = commonTags(linkedTags);

  function save() {
    start(async () => {
      if (props.mode === "template") {
        const r = await saveTemplate({ id: templateId, name, description: description.trim() || null, tags, content: content() });
        if (!r.ok) return void toast.error(r.error);
        setDirty(false);
        toast.success("Kit salvo");
        if (!templateId && r.id) {
          setTemplateId(r.id);
          router.replace(`/treinador/kits/${r.id}`);
        }
        router.refresh();
        return;
      }
      const r = await saveDiet({ planId, studentId: props.studentId, name, ...content() });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success("Dieta salva");
      if (!planId && r.planId) {
        setPlanId(r.planId);
        router.replace(`/treinador/alunos/${props.studentId}/dieta/${r.planId}`);
      }
      router.refresh();
    });
  }

  /** Copia a dieta atual para um kit novo (etiquetas: as comuns aos alimentos do banco). */
  function saveAsKit() {
    const kitName = prompt("Nome do kit (ex.: Cutting 1800 kcal — zero lactose):", name ? `${name} (kit)` : "");
    if (!kitName) return;
    start(async () => {
      const r = await saveTemplate({ id: null, name: kitName, description: null, tags: safeTags, content: content() });
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Kit “${kitName}” salvo${safeTags.length ? ` · ${safeTags.map(tagLabel).join(", ")}` : ""}`);
    });
  }

  function applyKit(kit: KitOption) {
    const hasContent = meals.some((m) => m.items.some((it) => it.food)) || supps.length > 0;
    if (hasContent && !confirm(`Aplicar “${kit.name}”? As refeições, suplementos e metas atuais serão substituídos.`)) return;
    const st = toState({ meals: kit.content.meals, supplements: kit.content.supplements });
    setMeals(st.meals);
    setSupps(st.supps as SuppState[]);
    setTargets({
      kcalTarget: str(kit.content.kcalTarget),
      proteinG: str(kit.content.proteinG),
      carbsG: str(kit.content.carbsG),
      fatG: str(kit.content.fatG),
      waterGoalMl: str(kit.content.waterGoalMl),
    });
    if (kit.content.notes && !notes.trim()) setNotes(kit.content.notes);
    if (!name.trim()) setName(kit.name);
    setKitPicker(false);
    touch();
    toast.success(`Kit “${kit.name}” aplicado — ajuste as quantidades ao aluno e salve.`);
  }

  /** Recalcula kcal/macros de um item ligado ao banco a partir dos gramas. */
  function setGrams(mealKey: string, it: Item, gramsText: string) {
    const f = it.foodId ? foodById.get(it.foodId) : null;
    const g = num(gramsText);
    if (!f || g == null || Number.isNaN(g)) return updateItem(mealKey, it.key, { grams: gramsText });
    const m = scaleMacros(f, g);
    updateItem(mealKey, it.key, {
      grams: gramsText,
      quantity: `${g.toLocaleString("pt-BR")} g`,
      kcal: String(m.kcal),
      proteinG: String(m.proteinG),
      carbsG: String(m.carbsG),
      fatG: String(m.fatG),
    });
  }

  function pickFood(mealKey: string, it: Item, f: CatalogFood) {
    const g = f.unitGrams ?? 100;
    const m = scaleMacros(f, g);
    updateItem(mealKey, it.key, {
      food: f.name,
      foodId: f.id,
      grams: String(g),
      quantity: f.unitName && f.unitGrams ? `1 ${f.unitName} (${g.toLocaleString("pt-BR")} g)` : `${g.toLocaleString("pt-BR")} g`,
      kcal: String(m.kcal),
      proteinG: String(m.proteinG),
      carbsG: String(m.carbsG),
      fatG: String(m.fatG),
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
          <span className="label-mono">{isTemplate ? "Nome do kit" : "Nome da dieta"}</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              touch();
            }}
            placeholder={isTemplate ? "Ex.: Kit zero lactose — 1800 kcal" : "Ex.: Cutting — fase 1"}
            className={inputCls}
          />
        </label>
        {isTemplate && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">Descrição do kit (para a equipe)</span>
              <input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  touch();
                }}
                placeholder="Ex.: para pacientes com intolerância à lactose; base de ~1800 kcal"
                className={inputCls}
              />
            </label>
            <div className="flex flex-col gap-2">
              <span className="label-mono">Restrições atendidas</span>
              <div className="flex flex-wrap gap-2">
                {FOOD_TAGS.map((t) => {
                  const on = tags.includes(t.value);
                  const conflict = on && linkedTags.length > 0 && !safeTags.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setTags((ts) => (on ? ts.filter((x) => x !== t.value) : [...ts, t.value]));
                        touch();
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        conflict ? "border-red-400/70 text-red-300" : on ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {tags.some((t) => linkedTags.length > 0 && !safeTags.includes(t)) && (
                <p className="text-xs text-red-300">
                  Algum alimento do kit não tem essa etiqueta no banco. Revise o alimento ou a etiqueta do kit.
                </p>
              )}
            </div>
          </>
        )}
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
          {isTemplate
            ? "Água em branco = 35 ml por kg do último peso de cada aluno."
            : `Água em branco = 35 ml por kg do último peso do aluno (${(waterHint / 1000).toLocaleString("pt-BR")} L hoje).`}
        </p>
      </section>

      {/* Refeições */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="label-mono flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-orange" /> Refeições
          </h2>
          {props.mode === "diet" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKitPicker(true)}
                className="flex items-center gap-1.5 rounded-full border border-orange/50 px-3 py-1.5 text-xs text-orange hover:bg-orange/10"
              >
                <Library className="size-3.5" /> Usar kit
              </button>
              <button
                type="button"
                onClick={saveAsKit}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:border-white/30"
              >
                <Save className="size-3.5" /> Salvar como kit
              </button>
            </div>
          )}
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
                  <FoodField
                    value={it.food}
                    linked={!!it.foodId}
                    foods={foods}
                    onText={(text) => updateItem(meal.key, it.key, { food: text, foodId: null })}
                    onPick={(f) => pickFood(meal.key, it, f)}
                    className="col-span-2 md:col-span-1"
                  />
                  {it.foodId ? (
                    <div className="relative">
                      <input
                        inputMode="decimal"
                        value={it.grams}
                        onChange={(e) => setGrams(meal.key, it, e.target.value)}
                        aria-label="Gramas"
                        className={cn(inputCls, "pr-7")}
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-chumbo-100/50">g</span>
                    </div>
                  ) : (
                    <input value={it.quantity} onChange={(e) => updateItem(meal.key, it.key, { quantity: e.target.value })} placeholder="150 g" className={inputCls} />
                  )}
                  <input inputMode="numeric" value={it.kcal} readOnly={!!it.foodId} onChange={(e) => updateItem(meal.key, it.key, { kcal: e.target.value })} placeholder="kcal" className={cn(inputCls, it.foodId && "border-transparent bg-transparent text-chumbo-100/80")} />
                  <input inputMode="decimal" value={it.proteinG} readOnly={!!it.foodId} onChange={(e) => updateItem(meal.key, it.key, { proteinG: e.target.value })} placeholder="P" className={cn(inputCls, it.foodId && "border-transparent bg-transparent text-chumbo-100/80")} />
                  <input inputMode="decimal" value={it.carbsG} readOnly={!!it.foodId} onChange={(e) => updateItem(meal.key, it.key, { carbsG: e.target.value })} placeholder="C" className={cn(inputCls, it.foodId && "border-transparent bg-transparent text-chumbo-100/80")} />
                  <input inputMode="decimal" value={it.fatG} readOnly={!!it.foodId} onChange={(e) => updateItem(meal.key, it.key, { fatG: e.target.value })} placeholder="G" className={cn(inputCls, it.foodId && "border-transparent bg-transparent text-chumbo-100/80")} />
                  <input value={it.substitutions} onChange={(e) => updateItem(meal.key, it.key, { substitutions: e.target.value })} placeholder="Substituição (opcional)" className={cn(inputCls, "col-span-2 md:col-span-1")} />
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
      {props.mode === "diet" && kitPicker && <KitPicker kits={props.kits} onClose={() => setKitPicker(false)} onPick={applyKit} />}
    </div>
  );
}

function KitPicker({ kits, onClose, onPick }: { kits: KitOption[]; onClose: () => void; onPick: (k: KitOption) => void }) {
  const [filter, setFilter] = useState<string | null>(null);
  const list = kits.filter((k) => !filter || k.tags.includes(filter));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-label="Usar kit" onClick={onClose}>
      <div className="glass flex max-h-[85svh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-[2rem] p-6 md:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Usar kit de dieta</h2>
          <button type="button" onClick={onClose} className="text-chumbo-100/60 hover:text-white" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ value: null, label: "Todos" }, ...FOOD_TAGS].map((t) => (
            <button
              key={t.value ?? "all"}
              type="button"
              onClick={() => setFilter(t.value)}
              className={cn("rounded-full border px-3 py-1 text-xs", filter === t.value ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70")}
            >
              {t.label}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-chumbo-100/60">Nenhum kit {filter ? "com essa restrição" : "cadastrado"}. Crie em “Kits de dieta”.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((k) => {
              const total = sumMacros(k.content.meals.flatMap((m) => m.items));
              return (
                <li key={k.id}>
                  <button type="button" onClick={() => onPick(k)} className="flex w-full flex-col gap-1 rounded-2xl border border-white/10 p-4 text-left hover:border-orange/50">
                    <span className="font-medium">{k.name}</span>
                    {k.description && <span className="text-sm text-chumbo-100/60">{k.description}</span>}
                    <span className="text-xs text-chumbo-100/50">
                      {k.content.meals.length} refeições · {Math.round(total.kcal)} kcal · P {Math.round(total.proteinG)} · C {Math.round(total.carbsG)} · G {Math.round(total.fatG)}
                    </span>
                    {k.tags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {k.tags.map((t) => (
                          <span key={t} className="rounded-full bg-orange/15 px-2 py-0.5 text-[0.65rem] text-orange">
                            {tagLabel(t)}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
