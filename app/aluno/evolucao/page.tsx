import Link from "next/link";
import { PageTitle } from "@/components/aluno/page-title";
import { WeightChart } from "@/components/aluno/weight-chart";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { trySignedReadUrl } from "@/lib/storage";
import { MOODS } from "@/lib/validations";
import { formatDay } from "@/lib/week";

export const metadata = { title: "Evolução · FORGE" };

const kg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function EvolucaoPage() {
  const user = await requireUser();
  const checkIns = await db.checkIn.findMany({ where: { userId: user.id }, orderBy: { weekOf: "asc" } });

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
          {checkIns.length} check-ins · desde {formatDay(first.weekOf, { year: true })}
        </p>
      </PageTitle>

      <section aria-label="Gráfico de peso" className="glass rounded-3xl p-4 md:p-6">
        <WeightChart data={checkIns.map((c) => ({ label: formatDay(c.weekOf), weightKg: c.weightKg }))} />
      </section>

      <section aria-labelledby="historico" className="flex flex-col gap-4">
        <h2 id="historico" className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">
          Histórico
        </h2>
        <ul className="flex flex-col gap-4">
          {history.map((c) => (
            <li key={c.id} className="glass grid gap-4 rounded-3xl p-4 sm:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-2">
                <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-mono text-xs text-chumbo-100">Semana {formatDay(c.weekOf, { year: true })}</span>
                  <span className="num-thin text-3xl">{kg(c.weightKg)} kg</span>
                  <span className="text-sm text-chumbo-100">
                    Humor {c.mood}/5 · {MOODS.find((x) => x.value === c.mood)?.label}
                  </span>
                </p>
                {c.notes && <p className="text-sm whitespace-pre-line text-chumbo-100">{c.notes}</p>}
              </div>
              {(c.front || c.back) && (
                <div className="flex gap-2">
                  {[c.front, c.back].map((url, i) =>
                    url ? (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 overflow-hidden rounded-xl border border-white/10 hover:border-orange">
                        {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária */}
                        <img src={url} alt={`${i === 0 ? "Frente" : "Costas"}, semana ${formatDay(c.weekOf)}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
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
