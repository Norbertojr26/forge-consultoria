import "server-only";
import type { Sex } from "@prisma/client";
import { db } from "@/lib/db";
import { trySignedReadUrl } from "@/lib/storage";

/**
 * Acrescenta imageUrl / imageUrlEnd (URLs assinadas) a exercícios vindos do banco.
 * Prioridade: imagem enviada manualmente > arte FORGE aprovada do sexo pedido > a do outro sexo.
 * Sem nada disso, o componente cai para as fotos de referência (sourceId).
 */
export async function withImageUrls<T extends { id: string; imageKey: string | null }>(exercises: T[], sex: Sex | null = null) {
  const preferred: Sex = sex ?? "MALE";
  const arts = await db.exerciseArt.findMany({
    where: { exerciseId: { in: exercises.filter((e) => !e.imageKey).map((e) => e.id) }, approved: true },
    select: { exerciseId: true, sex: true, startKey: true, endKey: true },
  });
  return Promise.all(
    exercises.map(async (e) => {
      if (e.imageKey) return { ...e, imageUrl: await trySignedReadUrl(e.imageKey), imageUrlEnd: null };
      const mine = arts.filter((a) => a.exerciseId === e.id);
      const art = mine.find((a) => a.sex === preferred) ?? mine[0];
      if (!art) return { ...e, imageUrl: null, imageUrlEnd: null };
      const [imageUrl, imageUrlEnd] = await Promise.all([trySignedReadUrl(art.startKey), trySignedReadUrl(art.endKey)]);
      return { ...e, imageUrl, imageUrlEnd };
    }),
  );
}
