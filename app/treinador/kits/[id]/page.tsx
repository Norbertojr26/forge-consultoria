import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DietEditor, type EditorDiet } from "@/components/treinador/diet-editor";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCatalogFoods, parseKitContent } from "@/lib/food-data";

export const metadata = { title: "Kit de dieta · FORGE" };

export default async function KitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const kit = id === "novo" ? null : await db.dietTemplate.findUnique({ where: { id } });
  if (id !== "novo" && !kit) notFound();
  const c = kit ? parseKitContent(kit.content) : null;
  const initial: EditorDiet = {
    planId: null,
    name: kit?.name ?? "",
    notes: c?.notes ?? "",
    kcalTarget: c?.kcalTarget ?? null,
    proteinG: c?.proteinG ?? null,
    carbsG: c?.carbsG ?? null,
    fatG: c?.fatG ?? null,
    waterGoalMl: c?.waterGoalMl ?? null,
    meals: c?.meals ?? [],
    supplements: c?.supplements ?? [],
  };
  const foods = await getCatalogFoods();

  return (
    <>
      <Link href="/treinador/kits" className="flex w-fit items-center gap-2 text-sm text-chumbo-100/70 hover:text-white">
        <ArrowLeft className="size-4" /> Kits de dieta
      </Link>
      <div>
        <p className="label-mono">Kit de dieta · modelo reutilizável</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{kit?.name ?? "Novo kit"}</h1>
      </div>
      <DietEditor mode="template" templateId={kit?.id ?? null} description={kit?.description ?? ""} tags={kit?.tags ?? []} initial={initial} foods={foods} />
    </>
  );
}
