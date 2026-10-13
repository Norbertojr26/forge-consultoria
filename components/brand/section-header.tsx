import { Eyebrow } from "@/components/brand/eyebrow";
import { cn } from "@/lib/utils";

export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  className,
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex flex-col gap-4">
        <Eyebrow index={index}>{eyebrow}</Eyebrow>
        <h2 className="font-display-forge text-4xl md:text-6xl">{title}</h2>
      </div>
      {description && <p className="max-w-sm text-chumbo-100 md:text-right">{description}</p>}
    </div>
  );
}
