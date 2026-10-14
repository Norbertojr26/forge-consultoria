import { Pill, Salad, Stethoscope, UtensilsCrossed } from "lucide-react";
import { CardLabel, GlassCard } from "@/components/app/glass-card";
import { CheckButton } from "@/components/aluno/check-button";
import { WaterCard } from "@/components/aluno/water-card";
import { requireUser } from "@/lib/auth";
import { nowHHMM, sumMacros } from "@/lib/diet";
import { getTodayDiet } from "@/lib/diet-data";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dieta · FORGE" };

const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export default async function DietaPage() {
  const user = await requireUser();
  const { plan, water, meals, doses } = await getTodayDiet(user);
  const now = nowHHMM();
  // Próxima refeição: a primeira ainda não feita a partir de agora (ou a primeira pendente)
  const nextMeal = meals.find((m) => !m.done && (m.time ?? "99") >= now) ?? meals.find((m) => !m.done);

  const total = sumMacros(meals.flatMap((m) => m.items));
  const eaten = sumMacros(meals.filter((m) => m.done).flatMap((m) => m.items));
  const macros = [
    { label: "Proteína", value: eaten.proteinG, goal: plan?.proteinG ?? total.proteinG },
    { label: "Carbo", value: eaten.carbsG, goal: plan?.carbsG ?? total.carbsG },
    { label: "Gordura", value: eaten.fatG, goal: plan?.fatG ?? total.fatG },
  ];
  const kcalGoal = plan?.kcalTarget ?? total.kcal;

  return (
    <>
      <div>
        <p className="label-mono">{plan ? `Dieta${plan.trainer?.name ? ` · por ${plan.trainer.name}` : ""}` : "Alimentação e hidratação"}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{plan?.name ?? "Dieta"}</h1>
        {plan?.notes && <p className="mt-2 max-w-2xl text-sm text-chumbo-100/70">{plan.notes}</p>}
      </div>

      <WaterCard ml={water.ml} goal={water.goal} entries={water.entries} />

      {!plan ? (
        <GlassCard className="flex flex-col items-center gap-3 py-10 text-center">
          <Salad className="size-8 text-orange" />
          <h2 className="text-xl font-semibold">Sua dieta ainda não chegou</h2>
          <p className="max-w-sm text-sm text-chumbo-100/70">
            Assim que o treinador enviar, aparecem aqui as refeições com quantidades, os suplementos com horário e a sua meta de água.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Consumido hoje x meta */}
          {kcalGoal > 0 && (
            <GlassCard glow className="flex flex-col gap-5">
              <CardLabel icon={<UtensilsCrossed />}>Hoje · refeições marcadas</CardLabel>
              <div className="flex items-end gap-3">
                <span className="num-dot text-6xl">{fmt(eaten.kcal)}</span>
                <span className="mb-1 text-sm text-chumbo-100/60">/ {fmt(kcalGoal)} kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {macros.map((m) => (
                  <div key={m.label} className="flex flex-col gap-2">
                    <div>
                      <span className="label-mono !text-[0.6rem]">{m.label}</span>
                      <p className="text-sm whitespace-nowrap tabular-nums">
                        {fmt(m.value)}
                        <span className="text-chumbo-100/50"> / {fmt(m.goal)} g</span>
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-orange shadow-[0_0_12px_rgb(255_91_20/0.6)] transition-all"
                        style={{ width: `${m.goal ? Math.min(100, (m.value / m.goal) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Refeições */}
          {meals.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="label-mono">
                Refeições · {meals.filter((m) => m.done).length}/{meals.length}
              </h2>
              {meals.map((meal) => {
                const sub = sumMacros(meal.items);
                const isNext = meal.id === nextMeal?.id;
                return (
                  <div key={meal.id} className={cn("glass flex flex-col gap-3 rounded-3xl p-5", isNext && "border-orange/40", meal.done && "opacity-70")}>
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {meal.time && <span className="num-dot text-xl text-orange">{meal.time}</span>}
                          {isNext && <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[0.6rem] tracking-[0.12em] text-orange uppercase">Próxima</span>}
                        </div>
                        <h3 className="mt-1 text-lg font-medium">{meal.name}</h3>
                        {sub.kcal > 0 && (
                          <p className="text-xs text-chumbo-100/60">
                            {fmt(sub.kcal)} kcal · P {fmt(sub.proteinG)} g · C {fmt(sub.carbsG)} g · G {fmt(sub.fatG)} g
                          </p>
                        )}
                      </div>
                      <CheckButton kind="MEAL" refId={meal.id} done={meal.done} label={meal.name} />
                    </div>
                    <ul className="flex flex-col divide-y divide-white/5 rounded-2xl bg-white/[0.02]">
                      {meal.items.map((it) => (
                        <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                          {it.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element -- URL assinada
                            <img src={it.imageUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover" loading="lazy" />
                          )}
                          <span className="min-w-0 flex-1">
                            {it.food}
                            {it.substitutions && <span className="block text-xs text-chumbo-100/50">↺ {it.substitutions}</span>}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-chumbo-100/80">{it.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    {meal.notes && <p className="text-xs text-chumbo-100/60">{meal.notes}</p>}
                  </div>
                );
              })}
            </section>
          )}

          {/* Suplementos e medicações por horário */}
          {doses.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="label-mono">
                Suplementos e medicações · {doses.filter((d) => d.done).length}/{doses.length}
              </h2>
              <GlassCard className="p-0">
                <ul className="divide-y divide-white/5">
                  {doses.map(({ supplement: s, time, done }) => (
                    <li key={`${s.id}@${time}`} className={cn("flex items-center gap-4 px-5 py-3.5", done && "opacity-60")}>
                      <span className="num-dot w-14 shrink-0 text-lg text-orange">{time}</span>
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", s.kind === "MEDICATION" ? "bg-white/10" : "bg-orange/15 text-orange")}>
                        {s.kind === "MEDICATION" ? <Stethoscope className="size-4" /> : <Pill className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {s.name} <span className="font-normal text-chumbo-100/60">· {s.dose}</span>
                        </p>
                        <p className="truncate text-xs text-chumbo-100/50">
                          {s.kind === "MEDICATION" ? "Medicação · conforme prescrição médica" : "Suplemento"}
                          {s.notes && ` · ${s.notes}`}
                        </p>
                      </div>
                      <CheckButton kind="SUPPLEMENT" refId={s.id} slot={time} done={done} label={`${s.name} das ${time}`} />
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </section>
          )}
        </>
      )}
    </>
  );
}
