"use server";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Sex } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateImage, type ImagePart, ImageGenError } from "@/lib/ai-image";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { exerciseFramePrompt } from "@/lib/exercise-style";
import { deleteObject, getObjectBytes, putObject } from "@/lib/storage";
import type { ActionResult } from "@/lib/validations";

const SEXES: Sex[] = ["MALE", "FEMALE"];
const styleKeySetting = (sex: Sex) => `style_ref_${sex}`;
const extOf = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");
const dropKeys = (keys: (string | null | undefined)[]) =>
  Promise.all(keys.filter((k): k is string => !!k).map((k) => deleteObject(k).catch(() => {})));

function refresh() {
  revalidatePath("/treinador/exercicios");
  revalidatePath("/aluno", "layout");
}

async function referencePhoto(sourceId: string, frame: 0 | 1) {
  if (!/^[\w-]+$/.test(sourceId)) return null;
  try {
    const file = path.join(process.cwd(), "public", "exercises", sourceId, `${frame}.jpg`);
    return { bytes: new Uint8Array(await readFile(file)), mime: "image/jpeg" };
  } catch {
    return null;
  }
}

/**
 * Gera a proposta FORGE (posição inicial e final) para um sexo. Cada posição é uma chamada
 * separada com a foto real daquela posição — um personagem só, mesma câmera da foto.
 * A imagem-mestre do personagem (se definida) vai junto como referência de estilo.
 */
export async function generateExerciseArt(exerciseId: string, sex: Sex): Promise<ActionResult> {
  await requireStaff();
  if (!SEXES.includes(sex)) return { ok: false, error: "Versão inválida" };
  const ex = await db.exercise.findUnique({ where: { id: exerciseId } });
  if (!ex) return { ok: false, error: "Exercício não encontrado" };
  if (!ex.sourceId) return { ok: false, error: "Este exercício não tem foto de referência para copiar a pose" };

  const photos = await Promise.all([referencePhoto(ex.sourceId, 0), referencePhoto(ex.sourceId, 1)]);
  if (!photos[0]) return { ok: false, error: "Foto de referência não encontrada" };

  const styleSetting = await db.appSetting.findUnique({ where: { key: styleKeySetting(sex) } });
  const style = styleSetting ? await getObjectBytes(styleSetting.value).catch(() => null) : null;

  const frames = ([0, 1] as const).filter((f) => photos[f]);
  let images: { bytes: Uint8Array; mime: string }[];
  try {
    images = await Promise.all(
      frames.map((frame) => {
        const parts: ImagePart[] = [{ text: exerciseFramePrompt(ex, { sex, frame, hasStyleRef: !!style }) }];
        if (style) parts.push({ text: "STYLE REFERENCE (official FORGE mannequin — style only):" }, { image: style });
        parts.push({ text: "POSE PHOTO (copy pose and camera exactly):" }, { image: photos[frame]! });
        return generateImage({ parts, aspectRatio: "3:2" });
      }),
    );
  } catch (err) {
    if (err instanceof ImageGenError) return { ok: false, error: err.message };
    console.error("Falha ao gerar imagem", err);
    return { ok: false, error: "Falha ao gerar a imagem. Tente de novo." };
  }

  const batch = randomUUID();
  const keys = await Promise.all(
    images.map(async (img, i) => {
      const key = `exercises/${ex.id}/ia-${sex.toLowerCase()}-${batch}-${frames[i]}.${extOf(img.mime)}`;
      await putObject(key, img.bytes, img.mime);
      return key;
    }),
  );

  const old = await db.exerciseArt.findUnique({ where: { exerciseId_sex_approved: { exerciseId: ex.id, sex, approved: false } } });
  await db.exerciseArt.upsert({
    where: { exerciseId_sex_approved: { exerciseId: ex.id, sex, approved: false } },
    create: { exerciseId: ex.id, sex, approved: false, startKey: keys[0], endKey: keys[1] ?? null },
    update: { startKey: keys[0], endKey: keys[1] ?? null, createdAt: new Date() },
  });
  if (old) await dropKeys([old.startKey, old.endKey]);
  refresh();
  return { ok: true };
}

/** A proposta vira a imagem oficial daquela versão (substitui a anterior). */
export async function approveExerciseArt(exerciseId: string, sex: Sex): Promise<ActionResult> {
  await requireStaff();
  const [candidate, current] = await Promise.all(
    [false, true].map((approved) =>
      db.exerciseArt.findUnique({ where: { exerciseId_sex_approved: { exerciseId, sex, approved } } }),
    ),
  );
  if (!candidate) return { ok: false, error: "Nenhuma imagem aguardando aprovação" };
  await db.$transaction([
    ...(current ? [db.exerciseArt.delete({ where: { id: current.id } })] : []),
    db.exerciseArt.update({ where: { id: candidate.id }, data: { approved: true } }),
  ]);
  if (current) await dropKeys([current.startKey, current.endKey]);
  refresh();
  return { ok: true };
}

/** Descarta a proposta, ou (approved=true) remove a imagem aprovada. */
export async function discardExerciseArt(exerciseId: string, sex: Sex, approved = false): Promise<ActionResult> {
  await requireStaff();
  const art = await db.exerciseArt.findUnique({ where: { exerciseId_sex_approved: { exerciseId, sex, approved } } });
  if (!art) return { ok: true };
  await db.exerciseArt.delete({ where: { id: art.id } });
  await dropKeys([art.startKey, art.endKey]);
  refresh();
  return { ok: true };
}

/**
 * Define a imagem-mestre do personagem (por sexo) a partir da posição inicial de uma arte
 * deste exercício. É copiada para style/, então continua valendo se a arte for trocada.
 */
export async function setStyleReference(exerciseId: string, sex: Sex, approved: boolean): Promise<ActionResult> {
  await requireStaff();
  const art = await db.exerciseArt.findUnique({ where: { exerciseId_sex_approved: { exerciseId, sex, approved } } });
  if (!art) return { ok: false, error: "Imagem não encontrada" };
  const img = await getObjectBytes(art.startKey);
  const key = `style/${sex.toLowerCase()}-${randomUUID()}.${extOf(img.mime)}`;
  await putObject(key, img.bytes, img.mime);
  const name = styleKeySetting(sex);
  const old = await db.appSetting.findUnique({ where: { key: name } });
  await db.appSetting.upsert({ where: { key: name }, create: { key: name, value: key }, update: { value: key } });
  if (old) await dropKeys([old.value]);
  revalidatePath("/treinador/exercicios");
  return { ok: true };
}

export async function clearStyleReference(sex: Sex): Promise<ActionResult> {
  await requireStaff();
  const name = styleKeySetting(sex);
  const old = await db.appSetting.findUnique({ where: { key: name } });
  if (old) {
    await db.appSetting.delete({ where: { key: name } });
    await dropKeys([old.value]);
  }
  revalidatePath("/treinador/exercicios");
  return { ok: true };
}
