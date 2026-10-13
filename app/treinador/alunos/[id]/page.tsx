import { ArrowLeft, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { CardLabel, GlassCard } from "@/components/app/glass-card";
import { PillBars } from "@/components/app/pill-bars";
import { PlanActions } from "@/components/treinador/plan-actions";
import { requireManagedStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics";
import { goalLabel } from "@/lib/validations";
import { formatDay } from "@/lib/week";

const dateTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function AlunoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student } = await requireManagedStudent(id);

  const [plans, checkIns, sessions] = await Promise.all([
    db.workoutPlan.findMany({
      where: { studentId: id },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
      include: { days: { select: { _count: { select: { items: true } } } }, _count: { select: { days: true } } },
    }),
    db.checkIn.findMany({ where: { userId: id }, orderBy: { weekOf: "asc" }, select: { weekOf: true, weightKg: true } }),
    db.workoutSession.findMany({
      where: { userId: id },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: { day: { select: { name: true } }, _count: { select: { setLogs: true } } },
    }),
  ]);
  const m = computeMetrics(checkIns);
  const age = student.birthDate ? Math.floor((Date.now() - student.birthDate.getTime()) / (365.25 * 86_400_000)) : null;
  const recentWeights = checkIns.slice(-8).map((c) => ({ label: formatDay(c.weekOf), value: c.weightKg }));

  return (
    <>
      <Link href="/treinador" className="flex w-fit items-center gap-2 text-sm text-chumbo-100/70 hover:text-white">
        <ArrowLeft className="size-4" /> Alunos
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">{goalLabel(student.goal) ?? "Objetivo não informado"}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{student.name ?? student.email}</h1>
          <p className="mt-1 text-sm text-chumbo-100/60">
            {student.email}
            {age != null && ` · ${age} anos`}
            {student.heightCm && ` · ${student.heightCm} cm`}
          </p>
        </div>
        <Link
          href={`/treinador/alunos/${id}/plano/novo`}
          className="glow flex items-center gap-2 rounded-full bg-orange px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-black"
        >
          <Plus className="size-4" /> Novo plano de treino
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard>
          <CardLabel>Peso atual</CardLabel>
          <p className="num-thin mt-4 text-5xl">
            {m.currentWeight != null ? m.currentWeight.toLocaleString("pt-BR") : "—"}
            <span className="ml-1 text-base text-chumbo-100/60">kg</span>
          </p>
          <p className="mt-2 text-sm text-chumbo-100/60">
            {m.weeklyDelta != null ? `${m.weeklyDelta > 0 ? "+" : ""}${m.weeklyDelta.toLocaleString("pt-BR")} kg vs. anterior` : "Sem comparação ainda"}
          </p>
        </GlassCard>
        <GlassCard>
          <CardLabel>Aderência ao check-in</CardLabel>
          <p className="num-thin mt-4 text-5xl">
            {m.adherence != null ? Math.round(m.adherence * 100) : "—"}
            <span className="ml-1 text-base text-chumbo-100/60">%</span>
          </p>
          <p className="mt-2 text-sm text-chumbo-100/60">{m.doneThisWeek ? "Check-in da semana feito" : "Check-in da semana pendente"}</p>
        </GlassCard>
        <GlassCard>
          <CardLabel>Peso · últimas semanas</CardLabel>
          {recentWeights.length ? (
            <div className="mt-3">
              <PillBars data={recentWeights} height={80} format={(v) => `${v} kg`} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-chumbo-100/60">Sem check-ins.</p>
          )}
        </GlassCard>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="label-mono">Planos de treino</h2>
        {plans.length === 0 ? (
          <GlassCard className="text-sm text-chumbo-100/70">Nenhum plano ainda. Crie o primeiro em “Novo plano de treino”.</GlassCard>
        ) : (
          plans.map((p) => {
            const exercises = p.days.reduce((n, d) => n + d._count.items, 0);
            return (
              <GlassCard key={p.id} className="flex flex-wrap items-center justify-between gap-4" glow={p.active && !!p.sentAt}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">{p.name}</h3>
                    {p.active && p.sentAt ? (
                      <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[0.65rem] text-orange">ATIVO</span>
                    ) : !p.sentAt ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] text-chumbo-100">RASCUNHO</span>
                    ) : (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.65rem] text-chumbo-100/60">ANTERIOR</span>
                    )}
                  </div>
                  <p className="text-sm text-chumbo-100/60">
                    {p._count.days} {p._count.days === 1 ? "dia" : "dias"} · {exercises} {exercises === 1 ? "exercício" : "exercícios"}
                    {p.sentAt && ` · enviado ${dateTime.format(p.sentAt)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/treinador/alunos/${id}/plano/${p.id}`}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:border-white/30"
                  >
                    <Pencil className="size-3.5" /> Abrir
                  </Link>
                  <PlanActions planId={p.id} studentId={id} sent={!!p.sentAt} active={p.active} />
                </div>
              </GlassCard>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-mono">Treinos realizados</h2>
        {sessions.length === 0 ? (
          <GlassCard className="text-sm text-chumbo-100/70">O aluno ainda não registrou treinos.</GlassCard>
        ) : (
          <GlassCard className="p-0">
            <ul className="divide-y divide-white/5">
              {sessions.map((s) => {
                const mins = s.finishedAt ? Math.round((s.finishedAt.getTime() - s.startedAt.getTime()) / 60000) : null;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span className="min-w-0 truncate">{s.day.name}</span>
                    <span className="shrink-0 text-chumbo-100/60">
                      {s._count.setLogs} séries · {mins != null ? `${mins} min` : "em andamento"} · {dateTime.format(s.startedAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        )}
      </section>
    </>
  );
}
