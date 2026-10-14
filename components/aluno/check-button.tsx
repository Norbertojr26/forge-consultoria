"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleCheck } from "@/lib/actions/diet";
import { cn } from "@/lib/utils";

/** Botão redondo de "feito" para refeição ou dose do dia. */
export function CheckButton({ kind, refId, slot = "", done, label }: { kind: "MEAL" | "SUPPLEMENT"; refId: string; slot?: string; done: boolean; label: string }) {
  const [, start] = useTransition();
  const [checked, setChecked] = useOptimistic(done);
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={checked ? `Desmarcar ${label}` : `Marcar ${label} como feito`}
      onClick={() =>
        start(async () => {
          setChecked(!checked);
          const r = await toggleCheck(kind, refId, slot);
          if (!r.ok) toast.error(r.error);
        })
      }
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full border transition-all",
        checked ? "glow border-orange bg-orange text-black" : "border-white/15 text-transparent hover:border-orange/60 hover:text-orange/50",
      )}
    >
      <Check className="size-5" strokeWidth={3} />
    </button>
  );
}
