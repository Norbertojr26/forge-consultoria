"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { type ActionResult, type ProfileInput, profileSchema } from "@/lib/validations";

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { name, birthDate, heightCm, goal } = parsed.data;
  await db.user.update({
    where: { id: user.id },
    data: {
      name,
      birthDate: birthDate ? new Date(`${birthDate}T00:00:00Z`) : null,
      heightCm: heightCm ? Number(heightCm) : null,
      goal: goal || null,
    },
  });

  revalidatePath("/aluno", "layout");
  return { ok: true };
}
