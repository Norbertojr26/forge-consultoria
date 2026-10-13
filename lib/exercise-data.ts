import "server-only";
import { trySignedReadUrl } from "@/lib/storage";

/** Acrescenta imageUrl (URL assinada da imagem própria) a exercícios vindos do banco. */
export async function withImageUrls<T extends { imageKey: string | null }>(exercises: T[]) {
  return Promise.all(exercises.map(async (e) => ({ ...e, imageUrl: await trySignedReadUrl(e.imageKey) })));
}
