import "server-only";
import type { CatalogFood } from "@/components/treinador/food-field";
import type { KitOption } from "@/components/treinador/diet-editor";
import { db } from "@/lib/db";
import { type TemplateContent, templateContentSchema } from "@/lib/foods";
import { trySignedReadUrl } from "@/lib/storage";

/** Banco de alimentos para o seletor do editor (URLs assinadas só de quem tem foto). */
export async function getCatalogFoods(): Promise<CatalogFood[]> {
  const foods = await db.food.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, category: true, kcal: true, proteinG: true, carbsG: true, fatG: true, unitName: true, unitGrams: true, tags: true, imageKey: true },
  });
  return Promise.all(foods.map(async ({ imageKey, ...f }) => ({ ...f, imageUrl: await trySignedReadUrl(imageKey) })));
}

/** Conteúdo de kit salvo no banco, validado (um kit antigo/corrompido vira vazio em vez de quebrar a página). */
export function parseKitContent(raw: unknown): TemplateContent {
  const parsed = templateContentSchema.safeParse(raw);
  return parsed.success
    ? parsed.data
    : { notes: null, kcalTarget: null, proteinG: null, carbsG: null, fatG: null, waterGoalMl: null, meals: [], supplements: [] };
}

export async function getKits(): Promise<KitOption[]> {
  const kits = await db.dietTemplate.findMany({ orderBy: { name: "asc" } });
  return kits.map((k) => ({ id: k.id, name: k.name, description: k.description, tags: k.tags, content: parseKitContent(k.content) }));
}
