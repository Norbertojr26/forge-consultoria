"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteObject, putObject } from "@/lib/storage";
import { type ActionResult, checkInSchema, parseWeight } from "@/lib/validations";
import { weekOf } from "@/lib/week";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Confere a assinatura do arquivo em vez de confiar no Content-Type enviado pelo cliente. */
function sniffImage(bytes: Uint8Array): { ext: string; type: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return { ext: "png", type: "image/png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  return null;
}

async function storePhoto(file: File, userId: string, week: string, side: "front" | "back") {
  if (file.size > MAX_PHOTO_BYTES) throw new PhotoError("Foto acima de 4 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new PhotoError("Formato de foto não suportado (use JPG, PNG ou WEBP)");
  const key = `checkins/${userId}/${week}/${side}-${randomUUID()}.${kind.ext}`;
  await putObject(key, bytes, kind.type);
  return key;
}

class PhotoError extends Error {}

const asFile = (v: FormDataEntryValue | null) => (v instanceof File && v.size > 0 ? v : null);

export async function submitCheckIn(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = checkInSchema.safeParse({
    weightKg: formData.get("weightKg") ?? "",
    mood: formData.get("mood") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const week = weekOf();
  const weekKey = week.toISOString().slice(0, 10);

  let photoFront: string | undefined;
  let photoBack: string | undefined;
  try {
    const front = asFile(formData.get("photoFront"));
    const back = asFile(formData.get("photoBack"));
    if (front) photoFront = await storePhoto(front, user.id, weekKey, "front");
    if (back) photoBack = await storePhoto(back, user.id, weekKey, "back");
  } catch (err) {
    if (err instanceof PhotoError) return { ok: false, error: err.message };
    console.error("Falha no upload da foto", err);
    return { ok: false, error: "Não foi possível enviar as fotos. Tente de novo." };
  }

  const data = {
    weightKg: parseWeight(parsed.data.weightKg),
    mood: Number(parsed.data.mood),
    notes: parsed.data.notes || null,
    // undefined mantém a foto já salva quando o aluno não envia uma nova
    ...(photoFront && { photoFront }),
    ...(photoBack && { photoBack }),
  };

  const where = { userId_weekOf: { userId: user.id, weekOf: week } };
  const previous = await db.checkIn.findUnique({ where, select: { photoFront: true, photoBack: true } });

  await db.checkIn.upsert({
    where,
    create: { userId: user.id, weekOf: week, ...data },
    update: data,
  });

  // Fotos substituídas não ficam esquecidas no bucket (privacidade e custo). Falha aqui não desfaz o check-in.
  const replaced = [
    photoFront && previous?.photoFront,
    photoBack && previous?.photoBack,
  ].filter((key): key is string => Boolean(key));
  await Promise.all(
    replaced.map((key) => deleteObject(key).catch((err) => console.error("Falha ao apagar foto antiga", key, err))),
  );

  revalidatePath("/aluno", "layout");
  return { ok: true };
}
