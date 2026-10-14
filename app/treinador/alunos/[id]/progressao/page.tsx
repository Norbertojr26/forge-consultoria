import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProgressionList } from "@/components/app/progression-list";
import { requireManagedStudent } from "@/lib/auth";
import { progressionByExercise } from "@/lib/workout-history";

export default async function ProgressaoAluno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student } = await requireManagedStudent(id);
  const items = await progressionByExercise(id);
  return (
    <>
      <Link href={`/treinador/alunos/${id}`} className="flex w-fit items-center gap-2 text-sm text-chumbo-100/70 hover:text-white">
        <ArrowLeft className="size-4" /> {student.name ?? student.email}
      </Link>
      <div>
        <p className="label-mono">Progressão de cargas · {student.name ?? student.email}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Evolução por exercício</h1>
        <p className="mt-2 max-w-2xl text-sm text-chumbo-100/60">
          Melhor série de cada treino (maior 1RM estimado, fórmula de Epley, até 12 reps), RIR informado pelo aluno e volume total. A variação compara o primeiro e o último treino registrados.
        </p>
      </div>
      <ProgressionList items={items} />
    </>
  );
}
