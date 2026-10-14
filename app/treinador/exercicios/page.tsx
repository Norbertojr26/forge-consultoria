import type { Sex } from "@prisma/client";
import { type ArtView, ExerciseCatalog } from "@/components/treinador/exercise-catalog";
import { imageGenConfigured } from "@/lib/ai-image";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { withImageUrls } from "@/lib/exercise-data";
import { trySignedReadUrl } from "@/lib/storage";

export const metadata = { title: "Exercícios · FORGE" };

export default async function ExerciciosPage() {
  await requireStaff();
  const [exercises, arts, styleSettings] = await Promise.all([
    db.exercise.findMany({ orderBy: [{ muscleGroup: "asc" }, { name: "asc" }] }),
    db.exerciseArt.findMany(),
    db.appSetting.findMany({ where: { key: { in: ["style_ref_MALE", "style_ref_FEMALE"] } } }),
  ]);

  const signed = await Promise.all(
    arts.map(async (a) => ({
      ...a,
      view: { startUrl: await trySignedReadUrl(a.startKey), endUrl: await trySignedReadUrl(a.endKey) } satisfies ArtView,
    })),
  );
  const artOf = (exerciseId: string, sex: Sex, approved: boolean) =>
    signed.find((a) => a.exerciseId === exerciseId && a.sex === sex && a.approved === approved)?.view ?? null;

  const rows = (await withImageUrls(exercises)).map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    instructions: e.instructions,
    sourceId: e.sourceId,
    imageUrl: e.imageUrl,
    imageUrlEnd: e.imageUrlEnd,
    hasManualImage: !!e.imageKey,
    arts: {
      MALE: { approved: artOf(e.id, "MALE", true), candidate: artOf(e.id, "MALE", false) },
      FEMALE: { approved: artOf(e.id, "FEMALE", true), candidate: artOf(e.id, "FEMALE", false) },
    },
  }));

  const styleUrl = async (sex: Sex) => trySignedReadUrl(styleSettings.find((s) => s.key === `style_ref_${sex}`)?.value);
  const styleRefs = { MALE: await styleUrl("MALE"), FEMALE: await styleUrl("FEMALE") };
  const withArt = rows.filter((r) => r.arts.MALE.approved || r.arts.FEMALE.approved).length;
  const pendingReview = rows.filter((r) => r.arts.MALE.candidate || r.arts.FEMALE.candidate).length;

  return (
    <>
      <div>
        <p className="label-mono">
          {rows.length} exercícios · {withArt} com imagem FORGE{pendingReview > 0 && ` · ${pendingReview} aguardando aprovação`}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catálogo de exercícios</h1>
        <p className="mt-2 max-w-2xl text-sm text-chumbo-100/60">
          Sem imagem FORGE aprovada, o aluno vê a foto real de referência (Free Exercise DB, domínio público). Gere as imagens no
          padrão FORGE abrindo cada exercício — versão masculina e feminina, posição inicial e final.
        </p>
      </div>
      <ExerciseCatalog rows={rows} styleRefs={styleRefs} aiEnabled={imageGenConfigured()} />
    </>
  );
}
