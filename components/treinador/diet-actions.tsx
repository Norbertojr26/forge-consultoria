"use client";

import { Copy, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteDiet, duplicateDiet, sendDiet } from "@/lib/actions/diet";

export function DietActions({ planId, studentId, sent, active }: { planId: string; studentId: string; sent: boolean; active: boolean }) {
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
              const r = await sendDiet(planId);
              if (r.ok) toast.success("Dieta enviada ao aluno");
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
            const r = await duplicateDiet(planId);
            if (r.ok && r.planId) router.push(`/treinador/alunos/${studentId}/dieta/${r.planId}`);
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
          if (!confirm("Excluir esta dieta?")) return;
          start(async () => {
            const r = await deleteDiet(planId);
            if (r.ok) toast.success("Dieta excluída");
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
