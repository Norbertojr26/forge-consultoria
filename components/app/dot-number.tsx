import { cn } from "@/lib/utils";

/** Número em fonte matricial de pontos (destaque principal de um painel). */
export function DotNumber({ value, className }: { value: string; className?: string }) {
  return <span className={cn("num-dot text-white", className)}>{value}</span>;
}
