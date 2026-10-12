import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Garante que o usuário logado no Clerk exista no banco e o retorna.
 * Substitui o webhook do Clerk no v1: a linha é criada no primeiro acesso.
 * Memoizado por request (layout e página chamam sem query duplicada).
 */
export const requireUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) redirect("/entrar");

  const existing = await db.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/entrar");

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Usuário do Clerk sem e-mail");

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  return db.user.upsert({
    where: { id: userId },
    create: { id: userId, email, name },
    update: {},
  });
});
