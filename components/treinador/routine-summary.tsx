import { HeartPulse, Moon, StretchHorizontal } from "lucide-react";
import { CardLabel, GlassCard } from "@/components/app/glass-card";
import { PillBars } from "@/components/app/pill-bars";
import { cardioKindLabel, formatHours, sleepQualityLabel } from "@/lib/routine";
import type { RoutineOverview } from "@/lib/routine-data";
import { formatDay } from "@/lib/week";

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

/** Resumo para o treinador: sono (7 noites), cardio e mobilidade da semana. */
export function RoutineSummary({ o }: { o: RoutineOverview }) {
  const r = o.routine;
  const s = o.sleep.stats7;
  const lastNight = o.sleep.series.at(-1)?.log ?? o.sleep.series.at(-2)?.log ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="flex flex-col gap-4">
        <CardLabel icon={<Moon />}>Sono · 7 noites{r?.sleepGoalHours ? ` · meta ${formatHours(r.sleepGoalHours)}` : ""}</CardLabel>
        <p className="num-thin text-4xl">
          {s ? formatHours(s.avgHours) : "—"}
          <span className="ml-2 text-sm text-chumbo-100/60">média 7 dias</span>
        </p>
        <p className="text-sm text-chumbo-100/60">
          {s
            ? `Qualidade ${s.avgQuality.toLocaleString("pt-BR")}/5 · ${s.onGoal != null ? `${s.onGoal}/${s.nights} na meta` : `${s.nights} noites`}`
            : "Sem noites registradas nos últimos 7 dias"}
          {lastNight && ` · última: ${formatHours(lastNight.hours)} (${sleepQualityLabel(lastNight.quality).toLowerCase()})`}
        </p>
        <PillBars
          height={60}
          data={o.sleep.series.slice(-7).map((n) => ({ label: weekday.format(n.date).replace(".", ""), value: n.log?.hours ?? null }))}
          format={formatHours}
        />
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <CardLabel icon={<HeartPulse />}>Cardio · semana</CardLabel>
        <p className="num-thin text-4xl">
          {o.cardio.week.sessions}
          {o.cardio.week.targetSessions > 0 && <span className="text-chumbo-100/40">/{o.cardio.week.targetSessions}</span>}
          <span className="ml-2 text-sm text-chumbo-100/60">
            sessões · {o.cardio.week.minutes}
            {o.cardio.week.targetMinutes ? `/${o.cardio.week.targetMinutes}` : ""} min
          </span>
        </p>
        {o.cardio.logs.length ? (
          <ul className="flex flex-col gap-1 text-sm text-chumbo-100/70">
            {o.cardio.logs.slice(0, 5).map((l) => (
              <li key={l.id} className="truncate">
                {formatDay(l.date)} · {cardioKindLabel(l.kind)} · {l.modality} · {l.durationMin} min
                {l.avgHr != null && ` · ${l.avgHr} bpm`}
                {l.rpe != null && ` · esforço ${l.rpe}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-chumbo-100/60">Nenhum cardio nesta semana.</p>
        )}
      </GlassCard>

      <GlassCard className="flex flex-col gap-4">
        <CardLabel icon={<StretchHorizontal />}>Mobilidade · semana</CardLabel>
        <p className="num-thin text-4xl">
          {o.mobility.daysThisWeek}
          {o.mobility.target != null && <span className="text-chumbo-100/40">/{o.mobility.target}</span>}
          <span className="ml-2 text-sm text-chumbo-100/60">dias</span>
        </p>
        <p className="text-sm text-chumbo-100/60">
          {r?.mobility.length ? `${r.mobility.length} exercícios na rotina${o.mobility.doneToday ? " · feita hoje" : ""}` : "Sem rotina de mobilidade prescrita."}
        </p>
      </GlassCard>
    </div>
  );
}
