import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DietEditor, type EditorDiet } from "@/components/treinador/diet-editor";
import { requireManagedStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatalogFoods, getKits } from "@/lib/food-data";

export default async function DietaPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  const { student } = await requireManagedStudent(id);

  let initial: EditorDiet = {
    planId: null,
    name: "",
    notes: "",
    kcalTarget: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    waterGoalMl: null,
    meals: [],
    supplements: [],
  };
  if (planId !== "nova") {
    const plan = await db.dietPlan.findFirst({
      where: { id: planId, studentId: id },
      include: { meals: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } }, supplements: { orderBy: { order: "asc" } } },
    });
    if (!plan) notFound();
    initial = {
      planId: plan.id,
      name: plan.name,
      notes: plan.notes ?? "",
      kcalTarget: plan.kcalTarget,
      proteinG: plan.proteinG,
      carbsG: plan.carbsG,
      fatG: plan.fatG,
      waterGoalMl: plan.waterGoalMl,
      meals: plan.meals.map((m) => ({
        name: m.name,
        time: m.time,
        notes: m.notes,
        items: m.items.map(({ food, quantity, kcal, proteinG, carbsG, fatG, substitutions, foodId, grams }) => ({ food, quantity, kcal, proteinG, carbsG, fatG, substitutions, foodId, grams })),
      })),
      supplements: plan.supplements.map(({ kind, name, dose, times, notes }) => ({ kind, name, dose, times, notes })),
    };
  }
  const [foods, kits] = await Promise.all([getCatalogFoods(), getKits()]);
  const lastWeight = await db.checkIn.findFirst({ where: { userId: id }, orderBy: { date: "desc" }, select: { weightKg: true } });

  return (
    <>
      <Link href={`/treinador/alunos/${id}`} className="flex w-fit items-center gap-2 text-sm text-chumbo-100/70 hover:text-white">
        <ArrowLeft className="size-4" /> {student.name ?? student.email}
      </Link>
      <div>
        <p className="label-mono">Dieta · {student.name ?? student.email}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{initial.planId ? initial.name : "Nova dieta"}</h1>
      </div>
      <DietEditor mode="diet" studentId={id} initial={initial} weightKg={lastWeight?.weightKg ?? null} foods={foods} kits={kits} />
    </>
  );
}
