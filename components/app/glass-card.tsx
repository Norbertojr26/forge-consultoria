import { cn } from "@/lib/utils";

/** Card de vidro escuro com borda iluminada (base de todo o app). */
export function GlassCard({
  className,
  glow,
  ...props
}: React.ComponentProps<"div"> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-3xl p-5",
        glow &&
          "before:pointer-events-none before:absolute before:-top-24 before:left-1/2 before:h-48 before:w-48 before:-translate-x-1/2 before:rounded-full before:bg-orange/25 before:blur-3xl",
        className,
      )}
      {...props}
    />
  );
}

export function CardLabel({ children, icon, className }: { children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <span className="label-mono">{children}</span>
      {icon && <span className="text-chumbo-100/70 [&_svg]:size-4">{icon}</span>}
    </div>
  );
}
