import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/aluno/metric-card";
import { PageTitle } from "@/components/aluno/page-title";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics";
import { goalLabel, MOODS } from "@/lib/validations";
import { formatDay } from "@/lib/week";

const kg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function DashboardPage() {
  const user = await requireUser();
  const checkIns = await db.checkIn.findMany({
    where: { userId: user.id },
    orderBy: { weekOf: "desc" },
    select: { id: true, weekOf: true, weightKg: true, mood: true },
  });
  const m = computeMetrics(checkIns);
  const firstName = user.name?.split(" ")[0] ?? "aluno";
  const profileIncomplete = !user.heightCm || !user.goal || !user.birthDate;

  return (
    <>
      <PageTitle index="00" eyebrow={goalLabel(user.goal) ?? "Painel"} title={`Fala, ${firstName}.`} />

      {profileIncomplete && (
        <p className="border border-orange/40 bg-orange/5 px-4 py-3 text-sm">
          Complete seu perfil (altura, nascimento e objetivo) pro treinador montar seu protocolo.{" "}
          <Link href="/aluno/perfil" className="text-orange underline underline-offset-4">
            Ir para o perfil
          </Link>
        </p>
      )}

      <section
        aria-label="Próximo check-in"
        className="flex flex-col justify-between gap-6 border border-orange/60 bg-chumbo-900 p-6 md:flex-row md:items-center md:p-8"
      >
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-[0.12em] text-orange uppercase">
            {m.nextCheckIn.pending ? "Check-in pendente" : "Check-in da semana feito"}
          </p>
          <p className="font-display-forge text-3xl md:text-4xl">
            {m.nextCheckIn.pending
              ? `Até sábado, ${formatDay(m.nextCheckIn.dueBy)}`
              : `Próximo: domingo, ${formatDay(m.nextCheckIn.weekOf)}`}
          </p>
          <p className="text-sm text-chumbo-100">
            Semana de {formatDay(m.nextCheckIn.weekOf)} a {formatDay(m.nextCheckIn.dueBy)}
          </p>
        </div>
        <Button asChild size="lg" variant={m.nextCheckIn.pending ? "default" : "outline"} className="h-12 px-8 font-mono uppercase">
          <Link href="/aluno/check-in">
            {m.nextCheckIn.pending ? "Fazer check-in" : "Editar check-in"} <ArrowUpRight />
          </Link>
        </Button>
      </section>

      <section aria-label="Métricas" className="grid gap-4 md:grid-cols-3">
        <MetricCard
          index="01"
          label="Peso atual"
          value={m.currentWeight !== null ? kg(m.currentWeight) : "—"}
          unit={m.currentWeight !== null ? "kg" : undefined}
          hint={checkIns[0] ? `Check-in de ${formatDay(checkIns[0].weekOf)}` : "Sem check-ins ainda"}
        />
        <MetricCard
          index="02"
          label="Δ semanal"
          value={m.weeklyDelta !== null ? `${m.weeklyDelta > 0 ? "+" : m.weeklyDelta < 0 ? "−" : ""}${kg(Math.abs(m.weeklyDelta))}` : "—"}
          unit={m.weeklyDelta !== null ? "kg" : undefined}
          hint={m.weeklyDelta !== null ? "Em relação ao check-in anterior" : "Precisa de 2 check-ins"}
          tone="accent"
        />
        <MetricCard
          index="03"
          label="Aderência"
          value={m.adherence !== null ? String(Math.round(m.adherence * 100)) : "—"}
          unit={m.adherence !== null ? "%" : undefined}
          hint="Semanas com check-in desde o primeiro"
        />
      </section>

      <section aria-labelledby="ultimos" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="ultimos" className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">
            Últimos check-ins
          </h2>
          {checkIns.length > 0 && (
            <Link href="/aluno/evolucao" className="font-mono text-xs tracking-[0.12em] text-orange uppercase hover:underline">
              Ver evolução
            </Link>
          )}
        </div>
        {checkIns.length === 0 ? (
          <p className="border border-dashed p-6 text-sm text-chumbo-100">
            Nenhum check-in ainda. O primeiro vira a base de comparação de todo o acompanhamento.
          </p>
        ) : (
          <ul className="divide-y border">
            {checkIns.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-mono text-xs text-chumbo-100">Semana {formatDay(c.weekOf)}</span>
                <span className="text-chumbo-100">{MOODS.find((x) => x.value === c.mood)?.label}</span>
                <span className="font-display-forge text-lg">{kg(c.weightKg)} kg</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
