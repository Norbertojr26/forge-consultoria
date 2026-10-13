import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type EditorPlan, PlanEditor } from "@/components/treinador/plan-editor";
import { requireManagedStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { withImageUrls } from "@/lib/exercise-data";

export default async function PlanoPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  const { student } = await requireManagedStudent(id);

  let initial: EditorPlan = { planId: null, name: "", notes: "", days: [] };
  let locked = false;
  if (planId !== "novo") {
    const plan = await db.workoutPlan.findFirst({
      where: { id: planId, studentId: id },
      include: { days: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } } },
    });
    if (!plan) notFound();
    initial = {
      planId: plan.id,
      name: plan.name,
      notes: plan.notes ?? "",
      days: plan.days.map((d) => ({
        name: d.name,
        items: d.items.map(({ exerciseId, sets, reps, loadKg, restSeconds, notes }) => ({ exerciseId, sets, reps, loadKg, restSeconds, notes })),
      })),
    };
    locked = (await db.workoutSession.count({ where: { day: { planId: plan.id } } })) > 0;
  }

  const exercises = await db.exercise.findMany({
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    select: { id: true, name: true, muscleGroup: true, equipment: true, sourceId: true, imageKey: true },
  });
  const catalog = (await withImageUrls(exercises)).map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    sourceId: e.sourceId,
    imageUrl: e.imageUrl,
  }));

  return (
    <>
      <Link href={`/treinador/alunos/${id}`} className="flex w-fit items-center gap-2 text-sm text-chumbo-100/70 hover:text-white">
        <ArrowLeft className="size-4" /> {student.name ?? student.email}
      </Link>
      <div>
        <p className="label-mono">Plano de treino · {student.name ?? student.email}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{initial.planId ? initial.name : "Novo plano"}</h1>
      </div>
      <PlanEditor studentId={id} studentName={student.name ?? student.email} catalog={catalog} initial={initial} locked={locked} />
    </>
  );
}
