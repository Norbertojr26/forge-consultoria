import { ChevronRight, Dumbbell } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/app/glass-card";
import { ExerciseImage } from "@/components/app/exercise-image";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withImageUrls } from "@/lib/exercise-data";
import { muscleLabel } from "@/lib/exercises";

export const metadata = { title: "Treino · FORGE" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function TreinoPage() {
  const user = await requireUser();
  const plan = await db.workoutPlan.findFirst({
    where: { studentId: user.id, active: true, sentAt: { not: null } },
    include: {
      trainer: { select: { name: true } },
      days: {
        orderBy: { order: "asc" },
        include: {
          items: { orderBy: { order: "asc" }, include: { exercise: { select: { id: true, name: true, muscleGroup: true, sourceId: true, imageKey: true } } } },
          sessions: { where: { userId: user.id, finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!plan) {
    return (
      <GlassCard className="flex flex-col items-center gap-3 py-12 text-center">
        <Dumbbell className="size-8 text-orange" />
        <h1 className="text-xl font-semibold">Seu treino ainda não chegou</h1>
        <p className="max-w-sm text-sm text-chumbo-100/70">Assim que o seu treinador enviar o plano, ele aparece aqui com cada exercício, séries e tempo de descanso.</p>
      </GlassCard>
    );
  }

  const covers = await withImageUrls(
    plan.days.flatMap((d) => (d.items[0] ? [d.items[0].exercise] : [])),
    user.sex,
  );

  return (
    <>
      <div>
        <p className="label-mono">Plano atual{plan.trainer?.name ? ` · por ${plan.trainer.name}` : ""}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{plan.name}</h1>
        {plan.notes && <p className="mt-2 text-sm text-chumbo-100/70">{plan.notes}</p>}
      </div>

      <ul className="flex flex-col gap-3">
        {plan.days.map((day, i) => {
          const muscles = [...new Set(day.items.map((it) => muscleLabel(it.exercise.muscleGroup)))].slice(0, 3);
          const last = day.sessions[0]?.finishedAt;
          const cover = covers.find((c) => c.id === day.items[0]?.exercise.id);
          return (
            <li key={day.id}>
              <Link href={`/aluno/treino/${day.id}`} className="glass group flex items-center gap-4 rounded-3xl p-3 pr-5 transition-colors hover:border-orange/40">
                <ExerciseImage name={cover?.name ?? day.name} imageUrl={cover?.imageUrl} sourceId={cover?.sourceId} className="size-20 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="label-mono">Dia {String.fromCharCode(65 + i)}</p>
                  <h2 className="truncate text-lg font-medium">{day.name}</h2>
                  <p className="truncate text-sm text-chumbo-100/60">
                    {day.items.length} exercícios · {muscles.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-chumbo-100/50">{last ? `Último: ${dateFmt.format(last)}` : "Ainda não feito"}</p>
                </div>
                <ChevronRight className="size-5 text-chumbo-100/40 transition-transform group-hover:translate-x-1 group-hover:text-orange" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
