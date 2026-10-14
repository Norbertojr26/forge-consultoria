"use client";

import { Check, Crown, ImageUp, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  approveFoodImage,
  deleteFood,
  discardFoodImage,
  generateFoodImage,
  saveFood,
  setFoodStyleReference,
  uploadFoodImage,
} from "@/lib/actions/foods";
import { FOOD_TAGS, type FoodTag, tagLabel } from "@/lib/foods";
import { cn } from "@/lib/utils";

export type FoodRow = {
  id: string;
  name: string;
  category: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  unitName: string | null;
  unitGrams: number | null;
  tags: string[];
  source: string;
  imageUrl: string | null;
  candidateUrl: string | null;
};

const PAGE = 60;
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-orange/60";
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function FoodCatalog({ rows, styleRef, aiEnabled }: { rows: FoodRow[]; styleRef: string | null; aiEnabled: boolean }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [photo, setPhoto] = useState<"" | "com" | "sem" | "pendente">("");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<string | null>(null);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
  const editingRow = editing && editing !== "new" ? (rows.find((r) => r.id === editing) ?? null) : null;

  const list = useMemo(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    return rows.filter(
      (r) =>
        (!tag || r.tags.includes(tag)) &&
        (!category || r.category === category) &&
        (!photo || (photo === "com" ? !!r.imageUrl : photo === "sem" ? !r.imageUrl : !!r.candidateUrl)) &&
        words.every((w) => norm(r.name).includes(w)),
    );
  }, [rows, q, tag, category, photo]);

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-chumbo-100/50" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Buscar alimento (ex.: arroz integral)"
            className={cn(inputCls, "pl-9")}
          />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(inputCls, "lg:w-64")} aria-label="Categoria">
          <option value="" className="bg-chumbo-900">
            Todas as categorias
          </option>
          {categories.map((c) => (
            <option key={c} value={c} className="bg-chumbo-900">
              {c}
            </option>
          ))}
        </select>
        <select value={photo} onChange={(e) => setPhoto(e.target.value as typeof photo)} className={cn(inputCls, "lg:w-48")} aria-label="Foto">
          <option value="" className="bg-chumbo-900">
            Com e sem foto
          </option>
          <option value="com" className="bg-chumbo-900">
            Com foto
          </option>
          <option value="sem" className="bg-chumbo-900">
            Sem foto
          </option>
          <option value="pendente" className="bg-chumbo-900">
            Foto aguardando aprovação
          </option>
        </select>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="glow flex shrink-0 items-center justify-center gap-2 rounded-full bg-orange px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-black uppercase"
        >
          <Plus className="size-4" /> Novo alimento
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {[{ value: null, label: "Todas as restrições" }, ...FOOD_TAGS].map((t) => (
          <button
            key={t.value ?? "all"}
            type="button"
            onClick={() => setTag(t.value)}
            className={cn("rounded-full border px-3 py-1 text-xs", tag === t.value ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70 hover:border-white/30")}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-chumbo-100/50">{list.length} encontrados</span>
      </div>

      <ul className="glass divide-y divide-white/5 overflow-hidden rounded-3xl">
        {list.slice(0, limit).map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => setEditing(f.id)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.03]">
              <span className="relative size-12 shrink-0">
                {f.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada
                  <img src={f.imageUrl} alt="" className="size-12 rounded-xl object-cover" loading="lazy" />
                ) : (
                  <span className="grid size-12 place-items-center rounded-xl bg-white/[0.04] text-[0.6rem] text-chumbo-100/40">sem foto</span>
                )}
                {f.candidateUrl && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-orange shadow-[0_0_8px_rgb(255_91_20/0.8)]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.name}</span>
                <span className="block truncate text-xs text-chumbo-100/50">
                  {f.category}
                  {f.source === "CUSTOM" && " · cadastrado pela equipe"}
                  {f.unitName && f.unitGrams && ` · 1 ${f.unitName} = ${fmt(f.unitGrams)} g`}
                </span>
              </span>
              <span className="hidden shrink-0 text-right text-xs tabular-nums text-chumbo-100/70 sm:block">
                <span className="text-base text-white">{Math.round(f.kcal)}</span> kcal
                <span className="block">
                  P {fmt(f.proteinG)} · C {fmt(f.carbsG)} · G {fmt(f.fatG)}
                </span>
              </span>
              <span className="hidden w-48 shrink-0 flex-wrap justify-end gap-1 md:flex">
                {f.tags.map((t) => (
                  <span key={t} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.6rem] text-chumbo-100/80">
                    {tagLabel(t)}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="self-center rounded-full border border-white/10 px-5 py-2 text-sm hover:border-white/30">
          Mostrar mais ({list.length - limit})
        </button>
      )}

      {editing && (editing === "new" || editingRow) && (
        <FoodForm key={editing} row={editingRow} categories={categories} styleRef={styleRef} aiEnabled={aiEnabled} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function FoodForm({
  row,
  categories,
  styleRef,
  aiEnabled,
  onClose,
}: {
  row: FoodRow | null;
  categories: string[];
  styleRef: string | null;
  aiEnabled: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aiPending, startAi] = useTransition();
  const [f, setF] = useState({
    name: row?.name ?? "",
    category: row?.category ?? "Personalizado",
    kcal: row ? String(row.kcal) : "",
    proteinG: row ? String(row.proteinG) : "",
    carbsG: row ? String(row.carbsG) : "",
    fatG: row ? String(row.fatG) : "",
    fiberG: row?.fiberG != null ? String(row.fiberG) : "",
    unitName: row?.unitName ?? "",
    unitGrams: row?.unitGrams != null ? String(row.unitGrams) : "",
  });
  const [tags, setTags] = useState<FoodTag[]>((row?.tags ?? []) as FoodTag[]);
  const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveFood(row?.id ?? null, {
        name: f.name,
        category: f.category,
        kcal: n(f.kcal) ?? 0,
        proteinG: n(f.proteinG) ?? 0,
        carbsG: n(f.carbsG) ?? 0,
        fatG: n(f.fatG) ?? 0,
        fiberG: n(f.fiberG),
        unitName: f.unitName.trim() || null,
        unitGrams: n(f.unitGrams),
        tags,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Alimento salvo");
      onClose();
      router.refresh();
    });
  }

  function ai(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    startAi(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Erro");
      toast.success(msg);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-label="Alimento" onClick={onClose}>
      <form onSubmit={save} className="glass flex max-h-[92svh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-[2rem] p-6 md:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{row ? "Editar alimento" : "Novo alimento"}</h2>
          <button type="button" onClick={onClose} className="text-chumbo-100/60 hover:text-white" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>

        {row && (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
            <span className="label-mono">Foto padrão FORGE</span>
            <div className="grid grid-cols-2 gap-3">
              <figure className="flex flex-col gap-1.5">
                {row.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada
                  <img src={row.imageUrl} alt={row.name} className="aspect-square w-full rounded-2xl object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-2xl border border-dashed border-white/10 text-xs text-chumbo-100/40">sem foto</div>
                )}
                <figcaption className="text-[0.65rem] text-chumbo-100/50">Atual (aparece para os alunos)</figcaption>
              </figure>
              <figure className="flex flex-col gap-1.5">
                {row.candidateUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada
                  <img src={row.candidateUrl} alt={`Proposta: ${row.name}`} className="aspect-square w-full rounded-2xl object-cover ring-1 ring-orange/60" />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-2xl border border-dashed border-white/10 px-3 text-center text-xs text-chumbo-100/40">
                    {aiPending ? "Gerando… (até 1 min)" : "Nenhuma proposta"}
                  </div>
                )}
                <figcaption className="text-[0.65rem] text-chumbo-100/50">Proposta da IA</figcaption>
              </figure>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {row.candidateUrl ? (
                <>
                  <button type="button" disabled={aiPending} onClick={() => ai(() => approveFoodImage(row.id), "Foto aprovada")} className="flex items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 text-black disabled:opacity-60">
                    <Check className="size-3.5" /> Aprovar
                  </button>
                  <button type="button" disabled={aiPending || !aiEnabled} onClick={() => ai(() => generateFoodImage(row.id), "Nova proposta gerada")} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-60">
                    <Sparkles className="size-3.5" /> Outra
                  </button>
                  <button type="button" disabled={aiPending} onClick={() => ai(() => discardFoodImage(row.id), "Proposta descartada")} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-chumbo-100/70 disabled:opacity-60">
                    <Trash2 className="size-3.5" /> Descartar
                  </button>
                </>
              ) : aiEnabled ? (
                <button type="button" disabled={aiPending} onClick={() => ai(() => generateFoodImage(row.id), "Proposta gerada — confira e aprove")} className="flex items-center gap-1.5 rounded-full border border-orange/50 px-3 py-1.5 text-orange hover:bg-orange/10 disabled:opacity-60">
                  <Sparkles className="size-3.5" /> {aiPending ? "Gerando…" : "Gerar foto FORGE"}
                </button>
              ) : (
                <span className="text-chumbo-100/50">Geração por IA desativada (OPENROUTER_API_KEY).</span>
              )}
              {(row.imageUrl || row.candidateUrl) && (
                <button type="button" disabled={aiPending} onClick={() => ai(() => setFoodStyleReference(row.id), "Foto-mestre definida")} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 disabled:opacity-60">
                  <Crown className="size-3.5" /> Usar como mestre
                </button>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5">
                <ImageUp className="size-3.5" /> Enviar foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("foodId", row.id);
                    fd.set("image", file);
                    ai(() => uploadFoodImage(fd), "Foto enviada");
                  }}
                />
              </label>
            </div>
            <p className="flex items-center gap-2 text-xs text-chumbo-100/50">
              {styleRef ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada */}
                  <img src={styleRef} alt="Foto-mestre" className="size-7 rounded-md object-cover" /> Foto-mestre definida: toda geração copia prato, ângulo e luz dela.
                </>
              ) : (
                "Sem foto-mestre: quando sair uma foto perfeita, use “Usar como mestre” para padronizar as próximas."
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="label-mono">Nome</span>
            <input value={f.name} onChange={set("name")} required className={inputCls} placeholder="Ex.: Leite, de vaca, integral" />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <span className="label-mono">Categoria</span>
            <input value={f.category} onChange={set("category")} list="food-categories" className={inputCls} />
            <datalist id="food-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <div className="col-span-2 grid grid-cols-2 gap-3 sm:col-span-1">
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">Porção</span>
              <input value={f.unitName} onChange={set("unitName")} className={inputCls} placeholder="unidade, fatia…" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-mono">g / porção</span>
              <input value={f.unitGrams} onChange={set("unitGrams")} inputMode="decimal" className={inputCls} placeholder="50" />
            </label>
          </div>
        </div>
        <div>
          <span className="label-mono">Composição por 100 g</span>
          <div className="mt-1.5 grid grid-cols-5 gap-2">
            {(
              [
                ["kcal", "kcal"],
                ["proteinG", "Prot. g"],
                ["carbsG", "Carb. g"],
                ["fatG", "Gord. g"],
                ["fiberG", "Fibra g"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-[0.65rem] text-chumbo-100/60">{label}</span>
                <input value={f[k]} onChange={set(k)} inputMode="decimal" required={k !== "fiberG"} className={inputCls} />
              </label>
            ))}
          </div>
        </div>
        <div>
          <span className="label-mono">Restrições que atende</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {FOOD_TAGS.map((t) => {
              const on = tags.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTags((ts) => (on ? ts.filter((x) => x !== t.value) : [...ts, t.value]))}
                  className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70")}
                >
                  {on ? "✓ " : ""}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {row ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Excluir “${row.name}” do banco? Dietas e kits que já usam mantêm os valores.`)) return;
                start(async () => {
                  await deleteFood(row.id);
                  toast.success("Alimento excluído");
                  onClose();
                  router.refresh();
                });
              }}
              className="flex items-center gap-1.5 text-xs text-chumbo-100/60 hover:text-red-300"
            >
              <Trash2 className="size-3.5" /> Excluir
            </button>
          ) : (
            <span />
          )}
          <button type="submit" disabled={pending} className="glow h-11 rounded-full bg-orange px-8 font-mono text-xs tracking-[0.14em] text-black uppercase disabled:opacity-60">
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
