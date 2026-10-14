"use client";

import { Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteTemplate, duplicateTemplate } from "@/lib/actions/foods";

export function KitActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const btn = "grid size-8 place-items-center rounded-full border border-white/10 text-chumbo-100/70 hover:border-white/30 hover:text-white disabled:opacity-50";
  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        type="button"
        disabled={pending}
        aria-label={`Duplicar ${name}`}
        className={btn}
        onClick={() =>
          start(async () => {
            const r = await duplicateTemplate(id);
            if (r.ok && r.id) router.push(`/treinador/kits/${r.id}`);
            else if (!r.ok) toast.error(r.error);
          })
        }
      >
        <Copy className="size-3.5" />
      </button>
      <button
        type="button"
        disabled={pending}
        aria-label={`Excluir ${name}`}
        className={`${btn} hover:border-red-400 hover:text-red-300`}
        onClick={() => {
          if (!confirm(`Excluir o kit “${name}”? Dietas já montadas com ele não mudam.`)) return;
          start(async () => {
            await deleteTemplate(id);
            toast.success("Kit excluído");
            router.refresh();
          });
        }}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
