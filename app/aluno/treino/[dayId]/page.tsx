import { notFound } from "next/navigation";
import { WorkoutPlayer } from "@/components/aluno/workout-player";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withImageUrls } from "@/lib/exercise-data";
import { suggestNext } from "@/lib/progression";
import { lastSessionByExercise } from "@/lib/workout-history";

export const metadata = { title: "Treinando · FORGE" };

export default async function TreinoDiaPage({ params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const user = await requireUser();

  const day = await db.workoutDay.findFirst({
    where: { id: dayId, plan: { studentId: user.id, active: true, sentAt: { not: null } } },
    include: { items: { orderBy: { order: "asc" }, include: { exercise: true } } },
  });
  if (!day || day.items.length === 0) notFound();

  // Só retoma uma sessão já aberta. Criar sessão aqui seria efeito colateral de uma leitura
  // (o Next pré-carrega links visíveis); a sessão nasce quando o aluno conclui a primeira série.
  const session = await db.workoutSession.findFirst({
    where: { userId: user.id, dayId: day.id, finishedAt: null },
    orderBy: { startedAt: "desc" },
    include: { setLogs: true },
  });

  const [exercises, history] = await Promise.all([
    withImageUrls(day.items.map((it) => it.exercise), user.sex),
    lastSessionByExercise(user.id, [...new Set(day.items.map((it) => it.exerciseId))]),
  ]);
  const items = day.items.map((it, i) => ({
    id: it.id,
    sets: it.sets,
    reps: it.reps,
    loadKg: it.loadKg,
    restSeconds: it.restSeconds,
    notes: it.notes,
    targetRir: it.targetRir,
    // Histórico do exercício (qualquer plano) e sugestão de carga para hoje
    last: (() => {
      const h = history.get(it.exerciseId);
      return h ? { date: h.date.toISOString(), sets: h.sets } : null;
    })(),
    suggestion: (() => {
      const h = history.get(it.exerciseId);
      return h ? suggestNext(h.sets, it.reps, it.targetRir) : null;
    })(),
    exercise: {
      name: it.exercise.name,
      muscleGroup: it.exercise.muscleGroup,
      instructions: it.exercise.instructions,
      sourceId: it.exercise.sourceId,
      imageUrl: exercises[i].imageUrl,
      imageUrlEnd: exercises[i].imageUrlEnd,
      videoUrl: exercises[i].videoUrl,
    },
    done: (session?.setLogs ?? [])
      .filter((l) => l.itemId === it.id)
      .map((l) => ({ setNumber: l.setNumber, reps: l.reps, loadKg: l.loadKg, rir: l.rir })),
  }));

  return (
    <WorkoutPlayer
      dayId={day.id}
      initialSession={session ? { id: session.id, startedAt: session.startedAt.toISOString() } : null}
      dayName={day.name}
      items={items}
    />
  );
}
