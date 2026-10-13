import Link from "next/link";
import { Container } from "@/components/brand/container";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { APPLY_URL, nav } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Seções" className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase transition-colors hover:text-orange"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase">
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="font-mono text-xs uppercase">
            <a href={APPLY_URL} target="_blank" rel="noopener noreferrer">
              Aplicar
            </a>
          </Button>
        </div>
      </Container>
    </header>
  );
}
