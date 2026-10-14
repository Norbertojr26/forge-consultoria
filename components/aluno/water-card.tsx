"use client";

import { Droplet, Undo2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Ring } from "@/components/app/ring";
import { addWater, undoWater } from "@/lib/actions/diet";
import { cn } from "@/lib/utils";

const AMOUNTS = [250, 500, 750];
const liters = (ml: number) => (ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

/** Meta de água do dia: anel com o total e botões de copo/garrafa. */
export function WaterCard({ ml, goal, entries, compact }: { ml: number; goal: number; entries: number; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(ml, (cur, delta: number) => Math.max(0, cur + delta));
  const done = optimistic >= goal;

  function add(amount: number) {
    start(async () => {
      setOptimistic(amount);
      const r = await addWater(amount);
      if (!r.ok) toast.error(r.error);
      else if (optimistic + amount >= goal && optimistic < goal) toast.success("Meta de água batida! 💧");
    });
  }

  return (
    <div className={cn("glass relative flex items-center gap-5 overflow-hidden rounded-3xl p-5", done && "border-orange/40")}>
      <Ring value={optimistic / goal} size={compact ? 92 : 116} stroke={compact ? 9 : 11}>
        <Droplet className={cn("mx-auto size-4", done ? "text-orange" : "text-chumbo-100/60")} />
        <span className="num-dot mt-1 block text-xl">{liters(optimistic)}</span>
      </Ring>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p className="label-mono">Água · meta {liters(goal)} L</p>
          <p className="mt-1 text-sm text-chumbo-100/70">
            {done ? "Meta do dia batida." : `Faltam ${liters(goal - optimistic)} L`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              disabled={pending}
              onClick={() => add(a)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs hover:border-orange/60 hover:text-white disabled:opacity-60"
            >
              +{a} ml
            </button>
          ))}
          {entries > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => void (await undoWater()))}
              className="p-1.5 text-chumbo-100/50 hover:text-white"
              aria-label="Desfazer último registro de água"
            >
              <Undo2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
