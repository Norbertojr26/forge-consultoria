import Link from "next/link";
import { PageTitle } from "@/components/aluno/page-title";
import { WeightChart } from "@/components/aluno/weight-chart";
import { ProgressionList } from "@/components/app/progression-list";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { trySignedReadUrl } from "@/lib/storage";
import { MEASURES, MOODS } from "@/lib/validations";
import { formatDay } from "@/lib/week";
import { progressionByExercise } from "@/lib/workout-history";
import { PillBars } from "@/components/app/pill-bars";
import { formatHours } from "@/lib/routine";
import { cardioMinutesByWeek, getRoutineOverview } from "@/lib/routine-data";

export const metadata = { title: "Evolução · FORGE" };

const kg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function EvolucaoPage() {
  const user = await requireUser();
  const checkIns = await db.checkIn.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, include: { feedbackBy: { select: { name: true } } } });

  if (checkIns.length === 0) {
    return (
      <>
        <PageTitle index="02" eyebrow="Evolução" title="Sem dados ainda" />
        <p className="text-chumbo-100">O gráfico aparece a partir do primeiro check-in.</p>
        <Button asChild size="lg" className="self-start font-mono uppercase">
          <Link href="/aluno/check-in">Fazer check-in</Link>
        </Button>
      </>
    );
  }

  const first = checkIns[0];
  const last = checkIns.at(-1)!;
  const total = Math.round((last.weightKg - first.weightKg) * 10) / 10;

  // Histórico mais recente primeiro, com fotos assinadas sob demanda (bucket privado)
  const history = await Promise.all(
    [...checkIns].reverse().map(async (c) => ({
      ...c,
      front: await trySignedReadUrl(c.photoFront),
      back: await trySignedReadUrl(c.photoBack),
    })),
  );

  return (
    <>
      <PageTitle index="02" eyebrow="Evolução de peso" title={`${total > 0 ? "+" : total < 0 ? "−" : ""}${kg(Math.abs(total))} kg`}>
        <p className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">
          {checkIns.length} check-ins · desde {formatDay(first.date, { year: true })}
        </p>
      </PageTitle>

      <section aria-label="Gráfico de peso" className="glass rounded-3xl p-4 md:p-6">
        <WeightChart data={checkIns.map((c) => ({ label: formatDay(c.date), weightKg: c.weightKg }))} />
      </section>

      {/* Medidas: primeira x última informada */}
      {(() => {
        const rows = MEASURES.map((mm) => {
          const withValue = checkIns.filter((c) => c[mm.key] != null);
          const a = withValue[0]?.[mm.key];
          const b = withValue.at(-1)?.[mm.key];
          return a != null && b != null ? { ...mm, a, b, diff: Math.round((b - a) * 10) / 10 } : null;
        }).filter((x) => x !== null);
        if (!rows.length) return null;
        return (
          <section aria-label="Medidas" className="glass rounded-3xl p-5">
            <p className="label-mono">Medidas · primeira × última</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {rows.map((r) => (
                <li key={r.key} className="flex flex-col gap-1">
                  <span className="label-mono !text-[0.6rem]">{r.label}</span>
                  <span className="num-thin text-3xl">
                    {r.b.toLocaleString("pt-BR")}
                    <span className="ml-1 text-sm text-chumbo-100/60">{r.unit}</span>
                  </span>
                  <span className={r.diff < 0 ? "text-xs text-orange" : "text-xs text-chumbo-100/60"}>
                    {r.diff > 0 ? "+" : r.diff < 0 ? "−" : ""}
                    {Math.abs(r.diff).toLocaleString("pt-BR")} {r.unit} desde {r.a.toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })()}

      {await (async () => {
        const prog = (await progressionByExercise(user.id, 8)).slice(0, 6);
        if (!prog.length) return null;
        return (
          <section aria-label="Cargas" className="flex flex-col gap-3">
            <h2 className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">Cargas · exercícios recentes</h2>
            <ProgressionList items={prog} compact />
          </section>
        );
      })()}

      {await (async () => {
        const [o, weeks] = await Promise.all([getRoutineOverview(user.id), cardioMinutesByWeek(user.id)]);
        const hasSleep = o.sleep.series.some((n) => n.log);
        const hasCardio = weeks.some((w) => w.minutes > 0);
        if (!hasSleep && !hasCardio) return null;
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {hasSleep && (
              <section aria-label="Sono" className="glass flex flex-col gap-4 rounded-3xl p-5">
                <p className="label-mono">Sono · 14 noites{o.sleep.stats7 ? ` · média ${formatHours(o.sleep.stats7.avgHours)}` : ""}</p>
                <PillBars height={100} data={o.sleep.series.map((n) => ({ label: formatDay(n.date).slice(0, 2), value: n.log?.hours ?? null }))} format={formatHours} />
              </section>
            )}
            {hasCardio && (
              <section aria-label="Cardio" className="glass flex flex-col gap-4 rounded-3xl p-5">
                <p className="label-mono">Cardio · minutos por semana</p>
                <PillBars height={100} data={weeks.map((w) => ({ label: formatDay(w.weekOf), value: w.minutes || null }))} format={(v) => `${v} min`} />
              </section>
            )}
          </div>
        );
      })()}

      <section aria-labelledby="historico" className="flex flex-col gap-4">
        <h2 id="historico" className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">
          Histórico
        </h2>
        <ul className="flex flex-col gap-4">
          {history.map((c) => (
            <li key={c.id} className="glass grid gap-4 rounded-3xl p-4 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-2">
                <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-mono text-xs text-chumbo-100">{formatDay(c.date, { year: true })}</span>
                  <span className="num-thin text-3xl">{kg(c.weightKg)} kg</span>
                  <span className="text-sm text-chumbo-100">
                    Humor {c.mood}/5 · {MOODS.find((x) => x.value === c.mood)?.label}
                  </span>
                </p>
                {c.notes && <p className="text-sm whitespace-pre-line text-chumbo-100">{c.notes}</p>}
                {MEASURES.some((mm) => c[mm.key] != null) && (
                  <p className="text-xs text-chumbo-100/70">
                    {MEASURES.filter((mm) => c[mm.key] != null)
                      .map((mm) => `${mm.label} ${c[mm.key]!.toLocaleString("pt-BR")} ${mm.unit}`)
                      .join(" · ")}
                  </p>
                )}
                {c.feedback && (
                  <div className="mt-1 rounded-2xl border border-orange/25 bg-orange/[0.06] p-3">
                    <p className="label-mono !text-orange">Retorno · {c.feedbackBy?.name ?? "treinador"}</p>
                    <p className="mt-1 text-sm whitespace-pre-line">{c.feedback}</p>
                  </div>
                )}
              </div>
              {(c.front || c.back) && (
                <div className="flex gap-2">
                  {[c.front, c.back].map((url, i) =>
                    url ? (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 overflow-hidden rounded-xl border border-white/10 hover:border-orange">
                        {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária */}
                        <img src={url} alt={`${i === 0 ? "Frente" : "Costas"}, ${formatDay(c.date)}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
                      </a>
                    ) : null,
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
