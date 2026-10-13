import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Role, User } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

/** E-mails que viram ADMIN automaticamente (variável ADMIN_EMAILS, separados por vírgula). */
function isAdminEmail(email: string) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Garante que o usuário logado no Clerk exista no banco e o retorna.
 * Substitui o webhook do Clerk: a linha é criada no primeiro acesso.
 * Memoizado por request (layout e página chamam sem query duplicada).
 */
export const requireUser = cache(async (): Promise<User> => {
  const { userId } = await auth();
  if (!userId) redirect("/entrar");

  const existing = await db.user.findUnique({ where: { id: userId } });
  if (existing) {
    if (existing.role !== "ADMIN" && isAdminEmail(existing.email)) {
      return db.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    }
    return existing;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/entrar");

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("Usuário do Clerk sem e-mail");

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  return db.user.upsert({
    where: { id: userId },
    create: { id: userId, email, name, role: isAdminEmail(email) ? "ADMIN" : "STUDENT" },
    update: {},
  });
});

export const isStaff = (role: Role) => role === "TRAINER" || role === "ADMIN";

/** Treinador ou admin; aluno recebe 404 (não revela que a área existe). */
export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.role)) notFound();
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}

/**
 * Aluno que o treinador logado pode gerenciar: admin vê todos,
 * treinador só os próprios alunos.
 */
export async function requireManagedStudent(studentId: string) {
  const staff = await requireStaff();
  const student = await db.user.findUnique({ where: { id: studentId } });
  if (!student) notFound();
  if (staff.role !== "ADMIN" && student.trainerId !== staff.id) notFound();
  return { staff, student };
}
