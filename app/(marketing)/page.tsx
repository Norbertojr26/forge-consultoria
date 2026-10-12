import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/brand/eyebrow";

// Placeholder da fase 1 — a landing completa entra na fase 2.
export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col justify-center gap-8 px-6 py-24 md:px-16">
      <Eyebrow index="01">FORGE Consultoria</Eyebrow>
      <h1 className="font-display-forge max-w-4xl text-5xl md:text-8xl">
        Forjado em <span className="text-orange">método</span>.
      </h1>
      <p className="max-w-xl text-chumbo-100">
        Landing em construção. Área do aluno já protegida por login.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/aluno">Área do aluno</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
