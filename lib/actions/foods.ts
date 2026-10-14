"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateImage, type ImagePart, ImageGenError } from "@/lib/ai-image";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { foodImagePrompt } from "@/lib/food-style";
import { type FoodInput, foodSchema, type TemplateInput, templateSchema } from "@/lib/foods";
import { deleteObject, getObjectBytes, putObject } from "@/lib/storage";
import type { ActionResult } from "@/lib/validations";

const STYLE_KEY = "style_ref_FOOD";
const MAX_IMAGE = 4 * 1024 * 1024;
const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Dados inválidos";
const extOf = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");
const drop = (key: string | null | undefined) => (key ? deleteObject(key).catch(() => {}) : Promise.resolve());

function refreshFoods() {
  revalidatePath("/treinador/alimentos");
  revalidatePath("/treinador/kits", "layout");
  revalidatePath("/aluno", "layout");
}

// ─── Alimentos ────────────────────────────────────────────

export async function saveFood(id: string | null, input: FoodInput): Promise<ActionResult & { id?: string }> {
  const staff = await requireStaff();
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const data = { ...parsed.data, unitName: parsed.data.unitName || null, unitGrams: parsed.data.unitName ? parsed.data.unitGrams : null };
  try {
    const food = id ? await db.food.update({ where: { id }, data }) : await db.food.create({ data: { ...data, createdById: staff.id } });
    refreshFoods();
    return { ok: true, id: food.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { ok: false, error: "Já existe um alimento com esse nome" };
    throw err;
  }
}

/** Exclui um alimento. Dietas e kits que o usam mantêm o texto e os macros já calculados. */
export async function deleteFood(id: string): Promise<ActionResult> {
  await requireStaff();
  const food = await db.food.findUnique({ where: { id } });
  if (!food) return { ok: true };
  await db.food.delete({ where: { id } });
  await Promise.all([drop(food.imageKey), drop(food.imageCandidateKey)]);
  refreshFoods();
  return { ok: true };
}

export async function uploadFoodImage(formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(formData.get("foodId") ?? "");
  const file = formData.get("image");
  const food = await db.food.findUnique({ where: { id } });
  if (!food) return { ok: false, error: "Alimento não encontrado" };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecione uma imagem" };
  if (file.size > MAX_IMAGE) return { ok: false, error: "Imagem acima de 4 MB" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isWebp = String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) return { ok: false, error: "Use JPG, PNG ou WEBP" };
  const mime = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp";
  const key = `foods/${id}/${randomUUID()}.${extOf(mime)}`;
  await putObject(key, bytes, mime);
  await db.food.update({ where: { id }, data: { imageKey: key } });
  await drop(food.imageKey);
  refreshFoods();
  return { ok: true };
}

/** Gera a foto no padrão FORGE (proposta); a foto-mestre, se definida, vai como referência de estilo. */
export async function generateFoodImage(id: string): Promise<ActionResult> {
  await requireStaff();
  const food = await db.food.findUnique({ where: { id } });
  if (!food) return { ok: false, error: "Alimento não encontrado" };
  const setting = await db.appSetting.findUnique({ where: { key: STYLE_KEY } });
  const style = setting ? await getObjectBytes(setting.value).catch(() => null) : null;

  const parts: ImagePart[] = [{ text: foodImagePrompt(food, !!style) }];
  if (style) parts.push({ text: "STYLE REFERENCE (official FORGE food photo — style only):" }, { image: style });
  let image: { bytes: Uint8Array; mime: string };
  try {
    image = await generateImage({ parts, aspectRatio: "1:1" });
  } catch (err) {
    if (err instanceof ImageGenError) return { ok: false, error: err.message };
    console.error("Falha ao gerar foto de alimento", err);
    return { ok: false, error: "Falha ao gerar a imagem. Tente de novo." };
  }
  const key = `foods/${id}/ia-${randomUUID()}.${extOf(image.mime)}`;
  await putObject(key, image.bytes, image.mime);
  await db.food.update({ where: { id }, data: { imageCandidateKey: key } });
  await drop(food.imageCandidateKey);
  refreshFoods();
  return { ok: true };
}

export async function approveFoodImage(id: string): Promise<ActionResult> {
  await requireStaff();
  const food = await db.food.findUnique({ where: { id } });
  if (!food?.imageCandidateKey) return { ok: false, error: "Nenhuma foto aguardando aprovação" };
  await db.food.update({ where: { id }, data: { imageKey: food.imageCandidateKey, imageCandidateKey: null } });
  await drop(food.imageKey);
  refreshFoods();
  return { ok: true };
}

export async function discardFoodImage(id: string): Promise<ActionResult> {
  await requireStaff();
  const food = await db.food.findUnique({ where: { id } });
  if (!food?.imageCandidateKey) return { ok: true };
  await db.food.update({ where: { id }, data: { imageCandidateKey: null } });
  await drop(food.imageCandidateKey);
  refreshFoods();
  return { ok: true };
}

/** Usa a foto (aprovada ou proposta) deste alimento como mestre de estilo das próximas. */
export async function setFoodStyleReference(id: string): Promise<ActionResult> {
  await requireStaff();
  const food = await db.food.findUnique({ where: { id } });
  const source = food?.imageKey ?? food?.imageCandidateKey;
  if (!source) return { ok: false, error: "Este alimento ainda não tem foto" };
  const img = await getObjectBytes(source);
  const key = `style/food-${randomUUID()}.${extOf(img.mime)}`;
  await putObject(key, img.bytes, img.mime);
  const old = await db.appSetting.findUnique({ where: { key: STYLE_KEY } });
  await db.appSetting.upsert({ where: { key: STYLE_KEY }, create: { key: STYLE_KEY, value: key }, update: { value: key } });
  await drop(old?.value);
  revalidatePath("/treinador/alimentos");
  return { ok: true };
}

// ─── Kits de dieta (modelos) ──────────────────────────────

export async function saveTemplate(input: TemplateInput): Promise<ActionResult & { id?: string }> {
  const staff = await requireStaff();
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id, name, description, tags, content } = parsed.data;
  if (content.meals.length === 0 && content.supplements.length === 0) return { ok: false, error: "Adicione ao menos uma refeição ou suplemento" };
  const data = { name, description: description || null, tags, content: content as Prisma.InputJsonValue };
  try {
    const t = id ? await db.dietTemplate.update({ where: { id }, data }) : await db.dietTemplate.create({ data: { ...data, createdById: staff.id } });
    revalidatePath("/treinador/kits", "layout");
    return { ok: true, id: t.id };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { ok: false, error: "Já existe um kit com esse nome" };
    throw err;
  }
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  await requireStaff();
  await db.dietTemplate.deleteMany({ where: { id } });
  revalidatePath("/treinador/kits", "layout");
  return { ok: true };
}

export async function duplicateTemplate(id: string): Promise<ActionResult & { id?: string }> {
  const staff = await requireStaff();
  const t = await db.dietTemplate.findUnique({ where: { id } });
  if (!t) return { ok: false, error: "Kit não encontrado" };
  let name = `${t.name} (cópia)`.slice(0, 80);
  for (let n = 2; await db.dietTemplate.findUnique({ where: { name } }); n++) name = `${t.name} (cópia ${n})`.slice(0, 80);
  const copy = await db.dietTemplate.create({
    data: { name, description: t.description, tags: t.tags, content: t.content as Prisma.InputJsonValue, createdById: staff.id },
  });
  revalidatePath("/treinador/kits", "layout");
  return { ok: true, id: copy.id };
}
