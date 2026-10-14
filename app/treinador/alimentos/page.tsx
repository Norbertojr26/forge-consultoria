import { FoodCatalog } from "@/components/treinador/food-catalog";
import { imageGenConfigured } from "@/lib/ai-image";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { trySignedReadUrl } from "@/lib/storage";

export const metadata = { title: "Alimentos · FORGE" };

export default async function AlimentosPage() {
  await requireStaff();
  const [foods, style] = await Promise.all([
    db.food.findMany({ orderBy: { name: "asc" } }),
    db.appSetting.findUnique({ where: { key: "style_ref_FOOD" } }),
  ]);
  const rows = await Promise.all(
    foods.map(async (f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      kcal: f.kcal,
      proteinG: f.proteinG,
      carbsG: f.carbsG,
      fatG: f.fatG,
      fiberG: f.fiberG,
      unitName: f.unitName,
      unitGrams: f.unitGrams,
      tags: f.tags,
      source: f.source,
      imageUrl: await trySignedReadUrl(f.imageKey),
      candidateUrl: await trySignedReadUrl(f.imageCandidateKey),
    })),
  );
  const withPhoto = rows.filter((r) => r.imageUrl).length;

  return (
    <>
      <div>
        <p className="label-mono">
          {rows.length} alimentos · {withPhoto} com foto · valores por 100 g
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Banco de alimentos</h1>
        <p className="mt-2 max-w-2xl text-sm text-chumbo-100/60">
          Base da Tabela TACO (NEPA/UNICAMP) + alimentos cadastrados pela equipe. As etiquetas de restrição da TACO foram sugeridas
          automaticamente — revise ao usar em kits para pacientes com restrição.
        </p>
      </div>
      <FoodCatalog rows={rows} styleRef={await trySignedReadUrl(style?.value)} aiEnabled={imageGenConfigured()} />
    </>
  );
}
