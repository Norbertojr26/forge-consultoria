import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { AlunoNav } from "@/components/aluno/aluno-nav";
import { Logo } from "@/components/brand/logo";
import { isStaff, requireUser } from "@/lib/auth";

// Dados pessoais e dependentes da data atual: nunca pré-renderizar.
export const dynamic = "force-dynamic";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="app-backdrop min-h-svh">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Logo href="/aluno" className="text-xl" />
        <div className="flex items-center gap-3">
          {isStaff(user.role) && (
            <Link href="/treinador" className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-chumbo-100 hover:text-white">
              <LayoutDashboard className="size-3.5" /> Painel do treinador
            </Link>
          )}
          <Link href="/aluno/perfil" className="glass grid size-8 place-items-center rounded-full text-chumbo-100 hover:text-white" aria-label="Meu perfil">
            <UserRound className="size-4" />
          </Link>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 pt-4 pb-32">{children}</main>
      <AlunoNav />
    </div>
  );
}
