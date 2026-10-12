import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/aluno" className="font-display-forge text-xl">
          FORGE<span className="text-orange">.</span>
        </Link>
        <UserButton />
      </header>
      <main className="px-6 py-10">{children}</main>
    </div>
  );
}
