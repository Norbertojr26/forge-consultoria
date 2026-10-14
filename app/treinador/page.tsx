import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/app/glass-card";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { goalLabel } from "@/lib/validations";
import { formatDay } from "@/lib/week";

export const metadata = { title: "Alunos · FORGE" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function TreinadorHome() {
  const staff = await requireStaff();
  const students = await db.user.findMany({
    where: { role: "STUDENT", ...(staff.role === "ADMIN" ? {} : { trainerId: staff.id }) },
    orderBy: { createdAt: "desc" },
    include: {
      trainer: { select: { name: true, email: true } },
      workoutPlans: { where: { active: true }, select: { name: true, sentAt: true }, take: 1 },
      workoutSessions: { where: { finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, take: 1, select: { finishedAt: true } },
      checkIns: { orderBy: { date: "desc" }, take: 1, select: { weightKg: true } },
    },
  });
  // Fila de retorno: check-ins sem feedback dos alunos deste treinador, mais antigos primeiro
  const queue = await db.checkIn.findMany({
    where: { feedback: null, user: { role: "STUDENT", ...(staff.role === "ADMIN" ? {} : { trainerId: staff.id }) } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true, date: true, createdAt: true, weightKg: true, user: { select: { id: true, name: true, email: true } } },
  });
  const hoursSince = (d: Date) => Math.floor((Date.now() - d.getTime()) / 3_600_000);
  const unassigned = staff.role === "ADMIN" ? students.filter((s) => !s.trainerId).length : 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">{staff.role === "ADMIN" ? "Todos os alunos" : "Seus alunos"}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Alunos</h1>
        </div>
        <div className="flex gap-3">
          <GlassCard className="rounded-2xl px-5 py-3">
            <p className="label-mono">Total</p>
            <p className="num-thin mt-1 text-3xl">{students.length}</p>
          </GlassCard>
          {staff.role === "ADMIN" && (
            <GlassCard className="rounded-2xl px-5 py-3">
              <p className="label-mono">Sem treinador</p>
              <p className="num-thin mt-1 text-3xl text-orange">{unassigned}</p>
            </GlassCard>
          )}
        </div>
      </div>

      {queue.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="label-mono flex items-center gap-2">
            <Clock className="size-4 text-orange" /> Check-ins aguardando retorno · {queue.length}
          </h2>
          <GlassCard className="p-0">
            <ul className="divide-y divide-white/5">
              {queue.map((q) => {
                const h = hoursSince(q.createdAt);
                return (
                  <li key={q.id}>
                    <Link href={`/treinador/alunos/${q.user.id}/check-ins#c-${q.id}`} className="flex items-center gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.03]">
                      <span className="min-w-0 flex-1 truncate font-medium">{q.user.name ?? q.user.email}</span>
                      <span className="hidden text-chumbo-100/60 sm:inline">
                        {formatDay(q.date)} · {q.weightKg.toLocaleString("pt-BR")} kg
                      </span>
                      <span className={h >= 12 ? "rounded-full bg-orange/15 px-2.5 py-0.5 text-xs text-orange" : "rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-chumbo-100/70"}>
                        {h < 1 ? "agora" : h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`}
                      </span>
                      <ChevronRight className="size-4 text-chumbo-100/40" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
        </section>
      )}

      {students.length === 0 ? (
        <GlassCard className="py-12 text-center text-sm text-chumbo-100/70">
          {staff.role === "ADMIN"
            ? "Nenhum aluno cadastrado ainda. Quando alguém criar conta, aparece aqui."
            : "Nenhum aluno atribuído a você ainda. O administrador define os alunos de cada treinador em Equipe."}
        </GlassCard>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {students.map((s) => {
            const plan = s.workoutPlans[0];
            const last = s.workoutSessions[0]?.finishedAt;
            return (
              <li key={s.id}>
                <Link href={`/treinador/alunos/${s.id}`} className="glass group flex items-center gap-4 rounded-3xl p-4 transition-colors hover:border-orange/40">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange/15 text-lg font-semibold text-orange">
                    {(s.name ?? s.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name ?? s.email}</p>
                    <p className="truncate text-sm text-chumbo-100/60">
                      {goalLabel(s.goal) ?? "Objetivo não informado"}
                      {s.checkIns[0] && ` · ${s.checkIns[0].weightKg.toLocaleString("pt-BR")} kg`}
                    </p>
                    <p className="mt-1 truncate text-xs text-chumbo-100/50">
                      {plan ? (plan.sentAt ? `Plano: ${plan.name}` : "Plano em rascunho") : "Sem plano"} ·{" "}
                      {last ? `treinou ${dateFmt.format(last)}` : "nenhum treino"}
                      {staff.role === "ADMIN" && ` · ${s.trainer ? (s.trainer.name ?? s.trainer.email) : "sem treinador"}`}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-chumbo-100/40 transition-transform group-hover:translate-x-1 group-hover:text-orange" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
