import { UserButton } from "@clerk/nextjs";
import { AlunoNav } from "@/components/aluno/aluno-nav";
import { Container } from "@/components/brand/container";
import { Logo } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth";

// Dados pessoais e dependentes da data atual: nunca pré-renderizar.
export const dynamic = "force-dynamic";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-black">
        <Container className="flex h-16 items-center justify-between">
          <Logo href="/aluno" />
          <UserButton />
        </Container>
        <Container>
          <AlunoNav />
        </Container>
      </header>
      <main className="flex-1 py-10 md:py-14">
        <Container className="flex flex-col gap-10">{children}</Container>
      </main>
    </div>
  );
}
