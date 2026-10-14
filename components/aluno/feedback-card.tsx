"use client";

import { Check, MessageSquareText } from "lucide-react";
import { useTransition } from "react";
import { markFeedbackSeen } from "@/lib/actions/checkin";

/** Retorno novo do treinador sobre o último check-in (some ao marcar como lido). */
export function FeedbackCard({ checkInId, trainer, when, text }: { checkInId: string; trainer: string; when: string; text: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="glass relative overflow-hidden rounded-3xl border-orange/40 p-5">
      <div className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full bg-orange/20 blur-3xl" />
      <div className="flex items-start justify-between gap-3">
        <p className="label-mono flex items-center gap-2 !text-orange">
          <MessageSquareText className="size-4" /> Retorno do treinador
        </p>
        <span className="rounded-full bg-orange px-2 py-0.5 text-[0.6rem] font-semibold tracking-[0.12em] text-black uppercase">Novo</span>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line">{text}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-chumbo-100/60">
          {trainer} · {when}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await markFeedbackSeen(checkInId)))}
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-orange/60 disabled:opacity-60"
        >
          <Check className="size-3.5" /> Entendi
        </button>
      </div>
    </div>
  );
}
