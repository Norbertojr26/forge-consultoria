"use client";

import { Camera, Dumbbell, House, LineChart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/aluno", label: "Hoje", icon: House },
  { href: "/aluno/treino", label: "Treino", icon: Dumbbell },
  { href: "/aluno/check-in", label: "Check-in", icon: Camera },
  { href: "/aluno/evolucao", label: "Evolução", icon: LineChart },
  { href: "/aluno/perfil", label: "Perfil", icon: User },
];

/** Barra de navegação inferior flutuante (estilo app). */
export function AlunoNav() {
  const pathname = usePathname();
  // No player de treino a barra some para não cobrir as séries
  if (/^\/aluno\/treino\/.+/.test(pathname)) return null;
  return (
    <nav
      aria-label="Área do aluno"
      className="glass fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-between rounded-[1.75rem] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/aluno" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[0.65rem] transition-colors",
              active ? "text-orange" : "text-chumbo-100/60 hover:text-white",
            )}
          >
            <span className={cn("grid size-9 place-items-center rounded-xl transition-all", active && "glow bg-orange text-black")}>
              <Icon className="size-[18px]" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
