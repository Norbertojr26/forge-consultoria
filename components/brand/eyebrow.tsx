import { cn } from "@/lib/utils";

/** Etiqueta mono no estilo "/01 — PILAR". */
export function Eyebrow({
  index,
  children,
  className,
}: {
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("eyebrow flex items-center gap-3 text-orange", className)}>
      {index && <span className="text-chumbo-100">/{index}</span>}
      <span>{children}</span>
    </p>
  );
}
