import { ArrowUpRight, Camera, Dumbbell, Flame, Scale } from "lucide-react";
import Link from "next/link";
import { DotNumber } from "@/components/app/dot-number";
import { ExerciseImage } from "@/components/app/exercise-image";
import { CardLabel, GlassCard } from "@/components/app/glass-card";
import { PillBars } from "@/components/app/pill-bars";
import { Ring } from "@/components/app/ring";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics";
import { goalLabel } from "@/lib/validations";
import { formatDay, weekOf } from "@/lib/week";

const kg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const hello = () => {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

export default async function HojePage() {
  const user = await requireUser();
  // Semana corrente: weekOf() devolve o domingo à meia-noite UTC; o início real em SP é 03:00 UTC.
  const weekStart = new Date(weekOf().getTime() + 3 * 3_600_000);

  const [checkIns, plan, weekSessions] = await Promise.all([
    db.checkIn.findMany({ where: { userId: user.id }, orderBy: { weekOf: "desc" }, select: { weekOf: true, weightKg: true } }),
    db.workoutPlan.findFirst({
      where: { studentId: user.id, active: true, sentAt: { not: null } },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: {
            items: { orderBy: { order: "asc" }, take: 1, include: { exercise: { select: { name: true, sourceId: true } } } },
            _count: { select: { items: true } },
          },
        },
      },
    }),
    db.workoutSession.findMany({
      where: { userId: user.id, finishedAt: { not: null, gte: weekStart } },
      select: { dayId: true, finishedAt: true },
      orderBy: { finishedAt: "desc" },
    }),
  ]);

  const m = computeMetrics(checkIns);
  const firstName = user.name?.split(" ")[0] ?? "atleta";

  // Próximo treino: o dia seguinte ao último feito (em ciclo); sem histórico, o primeiro.
  let nextDay = plan?.days[0];
  if (plan && plan.days.length) {
    const last = await db.workoutSession.findFirst({
      where: { userId: user.id, finishedAt: { not: null }, day: { planId: plan.id } },
      orderBy: { finishedAt: "desc" },
      select: { dayId: true },
    });
    const idx = last ? plan.days.findIndex((d) => d.id === last.dayId) : -1;
    nextDay = plan.days[(idx + 1) % plan.days.length];
  }
  const weeklyTarget = plan?.days.length ?? 0;
  const weekly = weekSessions.length;
  const weights = [...checkIns].reverse().slice(-7).map((c) => ({ label: formatDay(c.weekOf), value: c.weightKg }));

  return (
    <>
      <div>
        <p className="label-mono">{goalLabel(user.goal) ?? "Seu painel"}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {hello()}, {firstName}.
        </h1>
      </div>

      {(!user.heightCm || !user.goal || !user.birthDate) && (
        <Link href="/aluno/perfil" className="glass flex items-center justify-between gap-3 rounded-3xl border-orange/30 px-5 py-4 text-sm">
          <span>Complete seu perfil (altura, nascimento e objetivo) para o treinador montar seu protocolo.</span>
          <ArrowUpRight className="size-4 shrink-0 text-orange" />
        </Link>
      )}

      {/* Destaque: peso atual em pontos + semana */}
      <GlassCard glow className="flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.14em] uppercase">Hoje</span>
          <Ring value={weeklyTarget ? weekly / weeklyTarget : 0} size={72} stroke={8}>
            <span className="text-xs tabular-nums">
              {weekly}/{weeklyTarget || "–"}
            </span>
          </Ring>
        </div>
        <div>
          <DotNumber value={m.currentWeight != null ? kg(m.currentWeight) : "--,-"} className="text-7xl sm:text-8xl" />
          <p className="label-mono mt-3">Peso atual · kg</p>
        </div>
        <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-5">
          <div>
            <p className="num-thin text-3xl">
              {m.weeklyDelta != null ? `${m.weeklyDelta > 0 ? "+" : m.weeklyDelta < 0 ? "−" : ""}${kg(Math.abs(m.weeklyDelta))}` : "—"}
            </p>
            <p className="label-mono mt-1 !text-[0.6rem]">Δ semanal kg</p>
          </div>
          <div>
            <p className="num-thin text-3xl">{m.adherence != null ? `${Math.round(m.adherence * 100)}%` : "—"}</p>
            <p className="label-mono mt-1 !text-[0.6rem]">Aderência</p>
          </div>
          <div>
            <p className="num-thin text-3xl">{weekly}</p>
            <p className="label-mono mt-1 !text-[0.6rem]">Treinos na semana</p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Próximo treino */}
        {nextDay ? (
          <Link href={`/aluno/treino/${nextDay.id}`} className="group relative overflow-hidden rounded-3xl bg-orange p-5 text-black transition-transform hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <p className="font-mono text-[0.68rem] tracking-[0.14em] uppercase opacity-70">Próximo treino</p>
              <Dumbbell className="size-5" />
            </div>
            <p className="mt-6 text-2xl leading-tight font-semibold">{nextDay.name}</p>
            <p className="mt-1 text-sm opacity-75">{nextDay._count.items} exercícios</p>
            <p className="mt-6 flex items-center gap-1 font-mono text-xs tracking-[0.14em] uppercase">
              Começar <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </p>
            {nextDay.items[0] && (
              <ExerciseImage
                name={nextDay.items[0].exercise.name}
                sourceId={nextDay.items[0].exercise.sourceId}
                className="absolute -right-6 -bottom-6 size-32 rotate-6 rounded-3xl opacity-40 mix-blend-multiply"
              />
            )}
          </Link>
        ) : (
          <GlassCard>
            <CardLabel icon={<Dumbbell />}>Treino</CardLabel>
            <p className="mt-6 text-lg">Aguardando o plano do treinador</p>
            <p className="mt-1 text-sm text-chumbo-100/60">Ele aparece aqui assim que for enviado.</p>
          </GlassCard>
        )}

        {/* Check-in */}
        <Link href="/aluno/check-in" className="glass group flex flex-col justify-between rounded-3xl p-5 transition-colors hover:border-orange/40">
          <CardLabel icon={<Camera />}>Check-in semanal</CardLabel>
          <div className="mt-6">
            <p className="text-2xl leading-tight font-semibold">{m.nextCheckIn.pending ? "Pendente" : "Feito"}</p>
            <p className="mt-1 text-sm text-chumbo-100/60">
              {m.nextCheckIn.pending ? `Até sábado, ${formatDay(m.nextCheckIn.dueBy)}` : `Próximo: domingo, ${formatDay(m.nextCheckIn.weekOf)}`}
            </p>
          </div>
          <p className="mt-6 flex items-center gap-1 font-mono text-xs tracking-[0.14em] text-orange uppercase">
            {m.nextCheckIn.pending ? "Fazer check-in" : "Editar"} <ArrowUpRight className="size-4" />
          </p>
        </Link>
      </div>

      {/* Peso por semana em pílulas */}
      <GlassCard className="flex flex-col gap-5">
        <CardLabel icon={<Scale />}>Peso por semana</CardLabel>
        {weights.length ? (
          <PillBars data={weights} format={(v) => `${kg(v)} kg`} />
        ) : (
          <p className="text-sm text-chumbo-100/60">O gráfico aparece a partir do primeiro check-in.</p>
        )}
        <Link href="/aluno/evolucao" className="flex items-center gap-1 self-end font-mono text-xs tracking-[0.14em] text-chumbo-100/70 uppercase hover:text-white">
          Ver evolução completa <ArrowUpRight className="size-4" />
        </Link>
      </GlassCard>

      {weekly > 0 && (
        <GlassCard className="flex items-center gap-4">
          <span className="glow grid size-11 shrink-0 place-items-center rounded-2xl bg-orange text-black">
            <Flame className="size-5" />
          </span>
          <p className="text-sm text-chumbo-100/80">
            {weekly === 1 ? "1 treino concluído" : `${weekly} treinos concluídos`} nesta semana
            {weeklyTarget > 0 && weekly >= weeklyTarget ? " — semana completa!" : "."}
          </p>
        </GlassCard>
      )}
    </>
  );
}
