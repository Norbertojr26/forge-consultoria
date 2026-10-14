import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/app/glass-card";
import { FeedbackForm, FrequencyPicker } from "@/components/treinador/checkin-review";
import { requireManagedStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics";
import { trySignedReadUrl } from "@/lib/storage";
import { MEASURES, MOODS } from "@/lib/validations";
import { formatDay } from "@/lib/week";

const kg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n * 10) / 10).toLocaleString("pt-BR")}`;
const ago = (d: Date) => {
  const h = Math.floor((Date.now() - d.getTime()) / 3_600_000);
  return h < 1 ? "agora há pouco" : h < 48 ? `há ${h}h` : `há ${Math.floor(h / 24)} dias`;
};

export default async function CheckInsAluno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student } = await requireManagedStudent(id);
  const checkIns = await db.checkIn.findMany({ where: { userId: id }, orderBy: { date: "desc" }, take: 16 });
  const m = computeMetrics(checkIns, new Date(), student.checkInEveryDays);

  const items = await Promise.all(
    checkIns.map(async (c, i) => {
      const prev = checkIns[i + 1] ?? null;
      const [front, back, prevFront, prevBack] = await Promise.all([
        trySignedReadUrl(c.photoFront),
        trySignedReadUrl(c.photoBack),
        trySignedReadUrl(prev?.photoFront),
        trySignedReadUrl(prev?.photoBack),
      ]);
      return { c, prev, photos: { front, back, prevFront, prevBack } };
    }),
  );

  return (
    <>
      <Link href={`/treinador/alunos/${id}`} className="flex w-fit items-center gap-2 text-sm text-chumbo-100/70 hover:text-white">
        <ArrowLeft className="size-4" /> {student.name ?? student.email}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">Check-ins · {student.name ?? student.email}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Revisão e retorno</h1>
          <p className="mt-1 text-sm text-chumbo-100/60">
            {m.nextCheckIn.overdue ? "Atrasado" : m.nextCheckIn.pending ? `Próximo pendente, até ${formatDay(m.nextCheckIn.dueBy)}` : `Próximo a partir de ${formatDay(m.nextCheckIn.opensOn)}`}
            {m.adherence != null && ` · aderência ${Math.round(m.adherence * 100)}%`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="label-mono">Frequência</span>
          <FrequencyPicker studentId={id} value={student.checkInEveryDays} />
        </div>
      </div>

      {items.length === 0 ? (
        <GlassCard className="text-sm text-chumbo-100/70">O aluno ainda não enviou check-ins.</GlassCard>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map(({ c, prev, photos }) => (
            <li key={c.id} id={`c-${c.id}`} className={`glass flex flex-col gap-5 rounded-3xl p-5 ${!c.feedback ? "border-orange/40" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label-mono">{formatDay(c.date, { year: true })}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                    <span className="num-thin text-4xl">{kg(c.weightKg)} kg</span>
                    {prev && <span className="text-sm text-chumbo-100/70">{signed(c.weightKg - prev.weightKg)} kg vs. anterior</span>}
                  </p>
                  <p className="mt-1 text-sm text-chumbo-100/60">
                    Semana {c.mood}/5 · {MOODS.find((x) => x.value === c.mood)?.label}
                  </p>
                </div>
                {!c.feedback ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-orange/15 px-3 py-1 text-xs text-orange">
                    <Clock className="size-3.5" /> Aguardando retorno · enviado {ago(c.createdAt)}
                  </span>
                ) : (
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-chumbo-100/60">
                    Respondido{c.feedbackSeenAt ? " · lido pelo aluno" : ""}
                  </span>
                )}
              </div>

              {(photos.front || photos.back) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["front", "back"] as const).map((side) => {
                    const now = photos[side];
                    const before = photos[side === "front" ? "prevFront" : "prevBack"];
                    if (!now) return null;
                    return (
                      <div key={side} className="flex flex-col gap-2">
                        <span className="label-mono">{side === "front" ? "Frente" : "Costas"} · anterior × atual</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[before, now].map((url, i) =>
                            url ? (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-white/10 hover:border-orange">
                                {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária */}
                                <img src={url} alt={`${side === "front" ? "Frente" : "Costas"} ${i === 0 ? "anterior" : "atual"}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
                              </a>
                            ) : (
                              <div key={i} className="grid aspect-[3/4] place-items-center rounded-2xl border border-dashed border-white/10 text-xs text-chumbo-100/40">
                                sem foto
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {MEASURES.some((mm) => c[mm.key] != null) && (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {MEASURES.filter((mm) => c[mm.key] != null).map((mm) => {
                    const v = c[mm.key]!;
                    const p = prev?.[mm.key];
                    return (
                      <li key={mm.key} className="rounded-2xl bg-white/[0.03] p-3">
                        <p className="label-mono !text-[0.6rem]">{mm.label}</p>
                        <p className="mt-1 text-lg tabular-nums">
                          {v.toLocaleString("pt-BR")} <span className="text-xs text-chumbo-100/50">{mm.unit}</span>
                        </p>
                        {p != null && <p className="text-xs text-chumbo-100/60">{signed(v - p)}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}

              {c.notes && (
                <div>
                  <p className="label-mono">Notas do aluno</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-chumbo-100/90">{c.notes}</p>
                </div>
              )}

              <FeedbackForm checkInId={c.id} initial={c.feedback} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
