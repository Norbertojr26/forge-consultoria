"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const config = {
  weightKg: { label: "Peso (kg)", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function WeightChart({ data }: { data: { label: string; weightKg: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full md:h-96">
      <LineChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
        <YAxis
          domain={["dataMin - 1", "dataMax + 1"]}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => v.toFixed(0)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Line
          dataKey="weightKg"
          type="monotone"
          stroke="var(--color-weightKg)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-weightKg)" }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
