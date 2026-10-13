import { cn } from "@/lib/utils";

/**
 * Gráfico de barras em pílulas: cada barra é um trilho escuro com o preenchimento
 * proporcional; a barra destacada (padrão: a última) acende em laranja.
 */
export function PillBars({
  data,
  highlight,
  height = 140,
  format = (v) => String(v),
}: {
  data: { label: string; value: number | null }[];
  highlight?: number;
  height?: number;
  format?: (v: number) => string;
}) {
  const values = data.map((d) => d.value ?? 0);
  const max = Math.max(1, ...values);
  const active = highlight ?? data.length - 1;
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: height + 28 }}>
      {data.map((d, i) => {
        const pct = d.value == null ? 0 : Math.max(0.08, d.value / max);
        const on = i === active && d.value != null;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full max-w-9 overflow-hidden rounded-full bg-white/[0.05] ring-1 ring-white/5" style={{ height }}>
              <div
                className={cn(
                  "absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-700",
                  on ? "glow bg-gradient-to-t from-orange to-orange-bright" : "bg-gradient-to-t from-white/10 to-white/20",
                )}
                style={{ height: `${pct * 100}%` }}
                title={d.value == null ? "sem dado" : format(d.value)}
              />
            </div>
            <span className={cn("label-mono !text-[0.6rem]", on && "!text-orange")}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
