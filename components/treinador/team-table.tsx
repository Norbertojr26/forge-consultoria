"use client";

import type { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { assignTrainer, setUserRole } from "@/lib/actions/trainer";

type Row = { id: string; name: string | null; email: string; role: Role; trainerId: string | null };

const ROLE_LABEL: Record<Role, string> = { STUDENT: "Aluno", TRAINER: "Treinador", ADMIN: "Admin" };
const selectCls = "rounded-xl border border-white/10 bg-chumbo-900 px-2.5 py-1.5 text-sm outline-none focus:border-orange/60 disabled:opacity-50";

export function TeamTable({ users, trainers, selfId }: { users: Row[]; trainers: { id: string; label: string }[]; selfId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(msg);
      else toast.error(r.error ?? "Erro");
      router.refresh();
    });

  return (
    <div className="glass overflow-x-auto rounded-3xl">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left">
            <th className="label-mono px-5 py-3 font-normal">Pessoa</th>
            <th className="label-mono px-5 py-3 font-normal">Papel</th>
            <th className="label-mono px-5 py-3 font-normal">Treinador responsável</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-5 py-3">
                <p>{u.name ?? "—"}</p>
                <p className="text-xs text-chumbo-100/50">{u.email}</p>
              </td>
              <td className="px-5 py-3">
                <select
                  value={u.role}
                  disabled={pending || u.id === selfId}
                  onChange={(e) => run(() => setUserRole(u.id, e.target.value as Role), "Papel atualizado")}
                  className={selectCls}
                  aria-label={`Papel de ${u.email}`}
                >
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-5 py-3">
                {u.role === "STUDENT" ? (
                  <select
                    value={u.trainerId ?? ""}
                    disabled={pending}
                    onChange={(e) => run(() => assignTrainer(u.id, e.target.value || null), "Treinador definido")}
                    className={selectCls}
                    aria-label={`Treinador de ${u.email}`}
                  >
                    <option value="">Sem treinador</option>
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-chumbo-100/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
