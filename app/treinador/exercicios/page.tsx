import { ExerciseCatalog } from "@/components/treinador/exercise-catalog";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { withImageUrls } from "@/lib/exercise-data";

export const metadata = { title: "Exercícios · FORGE" };

export default async function ExerciciosPage() {
  await requireStaff();
  const exercises = await db.exercise.findMany({ orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] });
  const rows = (await withImageUrls(exercises)).map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    instructions: e.instructions,
    sourceId: e.sourceId,
    imageUrl: e.imageUrl,
  }));
  const withOwn = rows.filter((r) => r.imageUrl).length;

  return (
    <>
      <div>
        <p className="label-mono">
          {rows.length} exercícios · {withOwn} com imagem própria
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catálogo de exercícios</h1>
        <p className="mt-2 max-w-2xl text-sm text-chumbo-100/60">
          Exercícios sem imagem própria mostram a foto real de referência (Free Exercise DB, domínio público). As imagens no padrão FORGE entram por aqui.
        </p>
      </div>
      <ExerciseCatalog rows={rows} />
    </>
  );
}
