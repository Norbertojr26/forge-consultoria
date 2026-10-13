"use client";

import { Dumbbell, Smartphone, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TrainerNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/treinador", label: "Alunos", icon: Users, match: (p: string) => p === "/treinador" || p.startsWith("/treinador/alunos") },
    { href: "/treinador/exercicios", label: "Exercícios", icon: Dumbbell, match: (p: string) => p.startsWith("/treinador/exercicios") },
    ...(isAdmin ? [{ href: "/treinador/equipe", label: "Equipe", icon: UsersRound, match: (p: string) => p.startsWith("/treinador/equipe") }] : []),
    { href: "/aluno", label: "Ver como aluno", icon: Smartphone, match: () => false },
  ];
  return (
    <nav aria-label="Painel do treinador" className="flex gap-1 overflow-x-auto lg:flex-col">
      {links.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm transition-colors",
              active ? "bg-orange/15 text-white ring-1 ring-orange/30" : "text-chumbo-100/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className={cn("size-4", active && "text-orange")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
