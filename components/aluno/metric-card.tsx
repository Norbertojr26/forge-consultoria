import { cn } from "@/lib/utils";

export function MetricCard({
  index,
  label,
  value,
  unit,
  hint,
  tone = "default",
}: {
  index: string;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "default" | "accent";
}) {
  return (
    <div className="flex flex-col justify-between gap-6 border bg-chumbo-900 p-6">
      <p className="flex justify-between font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">
        <span>{label}</span>
        <span>/{index}</span>
      </p>
      <div className="flex flex-col gap-1">
        <p className={cn("flex items-baseline gap-2", tone === "accent" && "text-orange")}>
          <span className="font-display-forge text-5xl">{value}</span>
          {unit && <span className="font-mono text-sm text-chumbo-100">{unit}</span>}
        </p>
        {hint && <p className="text-sm text-chumbo-100">{hint}</p>}
      </div>
    </div>
  );
}
