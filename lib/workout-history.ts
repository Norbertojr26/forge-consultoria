import "server-only";
import { db } from "@/lib/db";
import { bestSet, type LoggedSet } from "@/lib/progression";

export type LastTime = { date: Date; sets: LoggedSet[] };

/** Última sessão concluída de cada exercício (entre planos), com as séries em ordem. */
export async function lastSessionByExercise(userId: string, exerciseIds: string[]): Promise<Map<string, LastTime>> {
  const logs = await db.setLog.findMany({
    where: { exerciseId: { in: exerciseIds }, session: { userId, finishedAt: { not: null } } },
    orderBy: { completedAt: "desc" },
    take: exerciseIds.length * 40,
    select: { exerciseId: true, sessionId: true, setNumber: true, reps: true, loadKg: true, rir: true, completedAt: true },
  });
  const out = new Map<string, LastTime & { sessionId: string }>();
  for (const l of logs) {
    if (!l.exerciseId) continue;
    const cur = out.get(l.exerciseId);
    if (!cur) out.set(l.exerciseId, { sessionId: l.sessionId, date: l.completedAt, sets: [l] });
    else if (cur.sessionId === l.sessionId) cur.sets.push(l);
  }
  return new Map(
    [...out].map(([id, v]) => [
      id,
      {
        date: v.date,
        sets: [...(v.sets as (LoggedSet & { setNumber: number })[])]
          .sort((a, b) => a.setNumber - b.setNumber)
          .map(({ reps, loadKg, rir }) => ({ reps, loadKg, rir })),
      },
    ]),
  );
}

export type ExerciseProgress = {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sessions: { date: Date; best: { loadKg: number | null; reps: number | null; rir: number | null; e1rm: number | null }; volumeKg: number }[];
};

/** Evolução por exercício: melhor série de cada sessão (1RM estimado) e volume (kg × reps), mais recentes no fim. */
export async function progressionByExercise(userId: string, perExercise = 12): Promise<ExerciseProgress[]> {
  const logs = await db.setLog.findMany({
    where: { exerciseId: { not: null }, session: { userId, finishedAt: { not: null } } },
    orderBy: { completedAt: "asc" },
    select: { exerciseId: true, sessionId: true, reps: true, loadKg: true, rir: true, completedAt: true },
  });
  const ids = [...new Set(logs.map((l) => l.exerciseId!))];
  const exercises = await db.exercise.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, muscleGroup: true } });

  const byEx = new Map<string, Map<string, typeof logs>>();
  for (const l of logs) {
    const sessions = byEx.get(l.exerciseId!) ?? new Map();
    sessions.set(l.sessionId, [...(sessions.get(l.sessionId) ?? []), l]);
    byEx.set(l.exerciseId!, sessions);
  }
  return exercises
    .map((ex) => {
      const sessions = [...(byEx.get(ex.id)?.values() ?? [])].map((sets) => {
        const best = bestSet(sets)!;
        return {
          date: sets[0].completedAt,
          best: { loadKg: best.loadKg, reps: best.reps, rir: best.rir, e1rm: best.e1rm },
          volumeKg: Math.round(sets.reduce((v, s) => v + (s.loadKg ?? 0) * (s.reps ?? 0), 0)),
        };
      });
      return { exerciseId: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, sessions: sessions.slice(-perExercise) };
    })
    .filter((e) => e.sessions.length > 0)
    .sort((a, b) => b.sessions.at(-1)!.date.getTime() - a.sessions.at(-1)!.date.getTime());
}
