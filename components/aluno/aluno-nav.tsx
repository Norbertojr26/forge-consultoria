"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/aluno", label: "Painel" },
  { href: "/aluno/check-in", label: "Check-in" },
  { href: "/aluno/evolucao", label: "Evolução" },
  { href: "/aluno/perfil", label: "Perfil" },
];

export function AlunoNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Área do aluno" className="-mb-px flex gap-6 overflow-x-auto">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 py-3 font-mono text-xs tracking-[0.12em] uppercase transition-colors",
              active ? "border-orange text-white" : "border-transparent text-chumbo-100 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
