import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RoutineEditor } from "@/components/treinador/routine-editor";
import { RoutineSummary } from "@/components/treinador/routine-summary";
import { requireManagedStudent } from "@/lib/auth";
import { getRoutineOverview } from "@/lib/routine-data";

export default async function RotinaAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student } = await requireManagedStudent(id);
  const o = await getRoutineOverview(id);
  const r = o.routine;

  return (
    <>
      <Link href={`/treinador/alunos/${id}`} className="flex w-fit items-center gap-2 text-sm text-chumbo-100/70 hover:text-white">
        <ArrowLeft className="size-4" /> {student.name ?? student.email}
      </Link>
      <div>
        <p className="label-mono">Cardio · sono · mobilidade</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Rotina de {student.name?.split(" ")[0] ?? student.email}</h1>
        <p className="mt-1 text-sm text-chumbo-100/60">As mudanças valem na hora para o aluno; os registros já feitos na semana continuam contando.</p>
      </div>

      <RoutineSummary o={o} />

      <RoutineEditor
        studentId={id}
        initial={{
          sleepGoalHours: r?.sleepGoalHours ?? null,
          bedtime: r?.bedtime ?? null,
          sleepNotes: r?.sleepNotes ?? null,
          mobilityPerWeek: r?.mobilityPerWeek ?? null,
          mobilityNotes: r?.mobilityNotes ?? null,
          cardio: r?.cardio ?? [],
          mobility: r?.mobility ?? [],
        }}
      />
    </>
  );
}
