import Link from "next/link";
import { Container } from "@/components/brand/container";
import { Logo } from "@/components/brand/logo";
import { APPLY_URL, nav } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="border-t py-14">
      <Container className="flex flex-col gap-12">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="flex flex-col gap-3">
            <Logo className="text-4xl" />
            <p className="max-w-xs text-sm text-chumbo-100">
              Consultoria de treino e dieta com acompanhamento semanal.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 font-mono text-xs tracking-[0.12em] uppercase">
            <ul className="flex flex-col gap-3">
              {nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-chumbo-100 hover:text-orange">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/entrar" className="text-chumbo-100 hover:text-orange">
                  Área do aluno
                </Link>
              </li>
              <li>
                <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className="text-chumbo-100 hover:text-orange">
                  Aplicar
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-2 border-t pt-6 font-mono text-[0.65rem] tracking-[0.12em] text-chumbo-100 uppercase sm:flex-row">
          <span>© {new Date().getFullYear()} FORGE Consultoria</span>
          <span>Forjado em método</span>
        </div>
      </Container>
    </footer>
  );
}
