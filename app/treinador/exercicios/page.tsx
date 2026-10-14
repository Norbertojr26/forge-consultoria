import { ExerciseCatalog } from "@/components/treinador/exercise-catalog";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { imageGenConfigured } from "@/lib/ai-image";
import { withImageUrls } from "@/lib/exercise-data";
import { trySignedReadUrl } from "@/lib/storage";

export const metadata = { title: "Exercícios · FORGE" };

export default async function ExerciciosPage() {
  await requireStaff();
  const exercises = await db.exercise.findMany({ orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] });
  const rows = await Promise.all((await withImageUrls(exercises)).map(async (e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    instructions: e.instructions,
    sourceId: e.sourceId,
    imageUrl: e.imageUrl,
    candidateUrl: await trySignedReadUrl(e.imageCandidateKey),
  })));
  const withOwn = rows.filter((r) => r.imageUrl).length;
  const pendingReview = rows.filter((r) => r.candidateUrl).length;

  return (
    <>
      <div>
        <p className="label-mono">
          {rows.length} exercícios · {withOwn} com imagem própria{pendingReview > 0 && ` · ${pendingReview} aguardando aprovação`}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catálogo de exercícios</h1>
        <p className="mt-2 max-w-2xl text-sm text-chumbo-100/60">
          Exercícios sem imagem própria mostram a foto real de referência (Free Exercise DB, domínio público). As imagens no padrão FORGE entram por aqui.
        </p>
      </div>
      <ExerciseCatalog rows={rows} aiEnabled={imageGenConfigured()} />
    </>
  );
}
