"use client";

import { Copy, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deletePlan, duplicatePlan, sendPlan } from "@/lib/actions/trainer";

export function PlanActions({ planId, studentId, sent, active }: { planId: string; studentId: string; sent: boolean; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const btn = "flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:border-white/30 disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      {!(sent && active) && (
        <button
          type="button"
          disabled={pending}
          className={`${btn} border-orange/50 text-orange hover:border-orange`}
          onClick={() =>
            start(async () => {
              const r = await sendPlan(planId);
              if (r.ok) toast.success("Plano enviado ao aluno");
              else toast.error(r.error);
              router.refresh();
            })
          }
        >
          <Send className="size-3.5" /> {sent ? "Reativar" : "Enviar ao aluno"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className={btn}
        onClick={() =>
          start(async () => {
            const r = await duplicatePlan(planId);
            if (r.ok && r.planId) router.push(`/treinador/alunos/${studentId}/plano/${r.planId}`);
            else if (!r.ok) toast.error(r.error);
          })
        }
      >
        <Copy className="size-3.5" /> Duplicar
      </button>
      <button
        type="button"
        disabled={pending}
        className={`${btn} hover:border-destructive hover:text-destructive`}
        onClick={() => {
          if (!confirm("Excluir este plano? O histórico de treinos feitos com ele também será apagado.")) return;
          start(async () => {
            const r = await deletePlan(planId);
            if (r.ok) toast.success("Plano excluído");
            else toast.error(r.error);
            router.refresh();
          });
        }}
      >
        <Trash2 className="size-3.5" /> Excluir
      </button>
    </div>
  );
}
