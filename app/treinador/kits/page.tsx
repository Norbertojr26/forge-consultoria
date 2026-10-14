import { Plus } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/app/glass-card";
import { KitActions } from "@/components/treinador/kit-actions";
import { requireStaff } from "@/lib/auth";
import { sumMacros } from "@/lib/diet";
import { getKits } from "@/lib/food-data";
import { FOOD_TAGS, tagLabel } from "@/lib/foods";
import { cn } from "@/lib/utils";

export const metadata = { title: "Kits de dieta · FORGE" };

export default async function KitsPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  await requireStaff();
  const { tag } = await searchParams;
  const kits = (await getKits()).filter((k) => !tag || k.tags.includes(tag));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">Modelos para montar dietas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Kits de dieta</h1>
          <p className="mt-2 max-w-2xl text-sm text-chumbo-100/60">
            Monte uma vez com alimentos do banco e aplique na dieta de qualquer aluno com “Usar kit”. As etiquetas mostram as restrições que o kit atende.
          </p>
        </div>
        <Link href="/treinador/kits/novo" className="glow flex items-center gap-2 rounded-full bg-orange px-5 py-3 font-mono text-xs tracking-[0.14em] text-black uppercase">
          <Plus className="size-4" /> Novo kit
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[{ value: undefined, label: "Todos" }, ...FOOD_TAGS].map((t) => (
          <Link
            key={t.value ?? "all"}
            href={t.value ? `/treinador/kits?tag=${t.value}` : "/treinador/kits"}
            className={cn("rounded-full border px-3 py-1 text-xs", tag === t.value ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70 hover:border-white/30")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {kits.length === 0 ? (
        <GlassCard className="py-10 text-center text-sm text-chumbo-100/70">Nenhum kit {tag ? "com essa restrição" : "ainda"}.</GlassCard>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {kits.map((k) => {
            const total = sumMacros(k.content.meals.flatMap((m) => m.items));
            return (
              <li key={k.id} className="glass flex flex-col gap-3 rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/treinador/kits/${k.id}`} className="min-w-0 hover:text-orange">
                    <h2 className="text-lg font-medium">{k.name}</h2>
                    {k.description && <p className="mt-0.5 text-sm text-chumbo-100/60">{k.description}</p>}
                  </Link>
                  <KitActions id={k.id} name={k.name} />
                </div>
                <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="num-dot text-2xl">{Math.round(total.kcal)}</span>
                  <span className="text-chumbo-100/60">
                    kcal · P {Math.round(total.proteinG)} g · C {Math.round(total.carbsG)} g · G {Math.round(total.fatG)} g · {k.content.meals.length} refeições
                  </span>
                </p>
                {k.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {k.tags.map((t) => (
                      <span key={t} className="rounded-full bg-orange/15 px-2 py-0.5 text-[0.65rem] text-orange">
                        {tagLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
