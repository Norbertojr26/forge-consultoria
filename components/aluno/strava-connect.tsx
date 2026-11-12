"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectStrava } from "@/lib/actions/strava";

type Connection = {
  firstName: string | null;
  lastName: string | null;
  profilePicture: string | null;
  lastSyncAt: Date | null;
} | null;

const ERRORS: Record<string, string> = {
  access_denied: "Você cancelou a autorização no Strava.",
  missing_scope: "Marque a permissão de ver suas atividades para o FORGE importar os treinos.",
  athlete_in_use: "Essa conta do Strava já está ligada a outro aluno.",
  bad_state: "O link de conexão expirou. Tente de novo.",
};

function StravaLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

export function StravaConnect({ connection, status, reason }: { connection: Connection; status?: string; reason?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Aviso do retorno do OAuth (?strava=conectado|erro), uma vez, e limpa a URL
  useEffect(() => {
    if (!status) return;
    if (status === "conectado") toast.success("Strava conectado. Suas últimas atividades estão sendo importadas.");
    else toast.error(ERRORS[reason ?? ""] ?? "Não foi possível conectar o Strava.");
    router.replace("/aluno/perfil", { scroll: false });
  }, [status, reason, router]);

  function handleDisconnect() {
    if (!confirm("Desconectar do Strava? As atividades já importadas continuam no FORGE.")) return;
    startTransition(async () => {
      const r = await disconnectStrava();
      if (r.ok) toast.success("Strava desconectado.");
      else toast.error(r.error);
      router.refresh();
    });
  }

  if (!connection) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-chumbo-100/70">
          Conecte o Strava e suas corridas, pedaladas e caminhadas entram sozinhas no seu cardio.
        </p>
        <a
          href="/api/strava/connect"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#FC4C02] px-4 text-sm font-semibold text-white transition hover:bg-[#e04302]"
        >
          <StravaLogo />
          Conectar Strava
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-chumbo-700 bg-chumbo-900 px-4 py-3">
      {connection.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={connection.profilePicture} alt="" className="size-10 rounded-full" />
      ) : (
        <span className="grid size-10 place-items-center rounded-full bg-[#FC4C02] text-white">
          <StravaLogo />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {[connection.firstName, connection.lastName].filter(Boolean).join(" ") || "Atleta Strava"}
        </div>
        <div className="text-xs text-chumbo-100/60">
          Conectado ao Strava
          {connection.lastSyncAt && <> · último sync {new Date(connection.lastSyncAt).toLocaleString("pt-BR")}</>}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={pending} className="hover:text-destructive">
        {pending ? "…" : "Desconectar"}
      </Button>
    </div>
  );
}
