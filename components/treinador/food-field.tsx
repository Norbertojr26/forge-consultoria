"use client";

import { Database } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { tagLabel } from "@/lib/foods";
import { cn } from "@/lib/utils";

export type CatalogFood = {
  id: string;
  name: string;
  category: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  unitName: string | null;
  unitGrams: number | null;
  tags: string[];
  imageUrl: string | null;
};

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Campo de alimento: digita para buscar no banco (TACO + cadastrados) ou escreve livre.
 * Escolher do banco liga o item ao alimento e os macros passam a ser calculados pelos gramas.
 */
export function FoodField({
  value,
  linked,
  foods,
  onText,
  onPick,
  className,
}: {
  value: string;
  linked: boolean;
  foods: CatalogFood[];
  onText: (text: string) => void;
  onPick: (food: CatalogFood) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = norm(value.trim());
    if (q.length < 2) return [];
    // Todas as palavras digitadas precisam aparecer ("arroz integral" acha "Arroz, integral, cozido")
    const words = q.split(/\s+/);
    return foods
      .filter((f) => {
        const n = norm(f.name);
        return words.every((w) => n.includes(w));
      })
      .sort((a, b) => Number(norm(b.name).startsWith(q)) - Number(norm(a.name).startsWith(q)) || a.name.length - b.name.length)
      .slice(0, 8);
  }, [value, foods]);

  function pick(f: CatalogFood) {
    onPick(f);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        value={value}
        onChange={(e) => {
          onText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => (blurTimer.current = setTimeout(() => setOpen(false), 150))}
        onKeyDown={(e) => {
          if (!open || !matches.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Buscar alimento"
        role="combobox"
        aria-controls={listId}
        aria-expanded={open && matches.length > 0}
        aria-autocomplete="list"
        className={cn(
          "w-full rounded-xl border bg-white/[0.03] py-2 pr-3 pl-8 text-sm outline-none transition-colors focus:border-orange/60",
          linked ? "border-orange/40" : "border-white/10",
        )}
      />
      <Database
        className={cn("pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2", linked ? "text-orange" : "text-chumbo-100/30")}
        aria-label={linked ? "Do banco de alimentos" : undefined}
      />
      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 mt-1 max-h-80 min-w-72 overflow-y-auto rounded-2xl border border-white/10 bg-chumbo-900/95 p-1 shadow-2xl backdrop-blur-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((f, i) => (
            <li key={f.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => pick(f)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left", i === active && "bg-white/[0.06]")}
              >
                {f.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada
                  <img src={f.imageUrl} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-[0.6rem] text-chumbo-100/40">100g</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{f.name}</span>
                  <span className="block truncate text-[0.65rem] text-chumbo-100/50">
                    {Math.round(f.kcal)} kcal · P {f.proteinG} · C {f.carbsG} · G {f.fatG} /100 g
                    {f.tags.length > 0 && ` · ${f.tags.map(tagLabel).join(", ")}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
