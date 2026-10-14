import "server-only";
import type { Sex } from "@prisma/client";
import { db } from "@/lib/db";
import { trySignedReadUrl } from "@/lib/storage";

/**
 * Acrescenta imageUrl / imageUrlEnd / videoUrl (URLs assinadas) a exercícios vindos do banco.
 * Imagem: enviada manualmente > arte FORGE aprovada do sexo pedido > a do outro sexo.
 * Vídeo: enviado pelo treinador > clipe de IA da arte escolhida.
 * Sem nada disso, o componente cai para as fotos de referência (sourceId).
 */
export async function withImageUrls<T extends { id: string; imageKey: string | null; videoKey?: string | null }>(exercises: T[], sex: Sex | null = null) {
  const preferred: Sex = sex ?? "MALE";
  const arts = await db.exerciseArt.findMany({
    where: { exerciseId: { in: exercises.map((e) => e.id) }, approved: true },
    select: { exerciseId: true, sex: true, startKey: true, endKey: true, videoKey: true },
  });
  return Promise.all(
    exercises.map(async (e) => {
      const mine = arts.filter((a) => a.exerciseId === e.id);
      const art = mine.find((a) => a.sex === preferred) ?? mine[0];
      const videoUrl = await trySignedReadUrl(e.videoKey ?? art?.videoKey);
      if (e.imageKey) return { ...e, imageUrl: await trySignedReadUrl(e.imageKey), imageUrlEnd: null, videoUrl };
      if (!art) return { ...e, imageUrl: null, imageUrlEnd: null, videoUrl };
      const [imageUrl, imageUrlEnd] = await Promise.all([trySignedReadUrl(art.startKey), trySignedReadUrl(art.endKey)]);
      return { ...e, imageUrl, imageUrlEnd, videoUrl };
    }),
  );
}
