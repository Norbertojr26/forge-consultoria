"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveFeedback, setCheckInFrequency } from "@/lib/actions/checkin-review";
import { CHECKIN_FREQUENCIES } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/** Campo de retorno do treinador para um check-in. */
export function FeedbackForm({ checkInId, initial }: { checkInId: string; initial: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(initial ?? "");
  const [pending, start] = useTransition();
  const changed = text.trim() !== (initial ?? "");
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Retorno para o aluno: o que melhorou, o que ajustar (macros, cardio, cargas) e o foco da próxima semana."
        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-orange/60"
      />
      <button
        type="button"
        disabled={pending || !changed}
        onClick={() =>
          start(async () => {
            const r = await saveFeedback(checkInId, text);
            if (!r.ok) return void toast.error(r.error);
            toast.success(text.trim() ? "Retorno enviado ao aluno" : "Retorno removido");
            router.refresh();
          })
        }
        className="glow flex items-center gap-2 self-end rounded-full bg-orange px-4 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-black uppercase disabled:opacity-40 disabled:shadow-none"
      >
        <Send className="size-3.5" /> {pending ? "Enviando…" : initial ? "Atualizar retorno" : "Enviar retorno"}
      </button>
    </div>
  );
}

/** Seletor da frequência de check-in do aluno. */
export function FrequencyPicker({ studentId, value }: { studentId: string; value: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex rounded-full border border-white/10 p-0.5 text-xs" role="radiogroup" aria-label="Frequência do check-in">
      {CHECKIN_FREQUENCIES.map((f) => (
        <button
          key={f.days}
          type="button"
          role="radio"
          aria-checked={value === f.days}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setCheckInFrequency(studentId, f.days);
              if (!r.ok) return void toast.error(r.error);
              toast.success(`Check-in ${f.label.toLowerCase()}`);
              router.refresh();
            })
          }
          className={cn("rounded-full px-3 py-1.5 transition-colors", value === f.days ? "bg-orange text-black" : "text-chumbo-100/70 hover:text-white")}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
