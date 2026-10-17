import { HeartPulse, Moon, StretchHorizontal } from "lucide-react";
import { CardLabel, GlassCard } from "@/components/app/glass-card";
import { PillBars } from "@/components/app/pill-bars";
import { PageTitle } from "@/components/aluno/page-title";
import { CardioTracker, MobilityRoutine, SleepLogger } from "@/components/aluno/routine-cards";
import { requireUser } from "@/lib/auth";
import { formatHours } from "@/lib/routine";
import { getRoutineOverview } from "@/lib/routine-data";
import { formatDay } from "@/lib/week";

export const metadata = { title: "Rotina · FORGE" };

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

export default async function RotinaPage() {
  const user = await requireUser();
  const o = await getRoutineOverview(user.id);
  const r = o.routine;
  const goal = r?.sleepGoalHours ?? null;

  return (
    <>
      <PageTitle eyebrow="Cardio · sono · mobilidade" title="Sua rotina" />
      {!r && (
        <GlassCard className="text-sm text-chumbo-100/70">
          Seu treinador ainda não prescreveu cardio, meta de sono ou mobilidade. Enquanto isso, você já pode registrar suas noites e cardios por aqui.
        </GlassCard>
      )}

      {/* Sono */}
      <GlassCard glow className="flex flex-col gap-5">
        <CardLabel icon={<Moon />}>
          Sono{goal ? ` · meta ${formatHours(goal)}` : ""}
          {r?.bedtime ? ` · deitar ${r.bedtime}` : ""}
        </CardLabel>
        <SleepLogger goalHours={goal} bedtimeTarget={r?.bedtime ?? null} today={o.sleep.today} />
        {r?.sleepNotes && <p className="text-xs text-chumbo-100/60">{r.sleepNotes}</p>}
        {o.sleep.stats7 && (
          <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="num-thin text-3xl">{formatHours(o.sleep.stats7.avgHours)}</p>
                <p className="label-mono mt-1 !text-[0.6rem]">Média 7 dias</p>
              </div>
              <div>
                <p className="num-thin text-3xl">{o.sleep.stats7.avgQuality.toLocaleString("pt-BR")}</p>
                <p className="label-mono mt-1 !text-[0.6rem]">Qualidade /5</p>
              </div>
              <div>
                <p className="num-thin text-3xl">{o.sleep.stats7.onGoal != null ? `${o.sleep.stats7.onGoal}/${o.sleep.stats7.nights}` : o.sleep.stats7.nights}</p>
                <p className="label-mono mt-1 !text-[0.6rem]">{o.sleep.stats7.onGoal != null ? "Noites na meta" : "Noites registradas"}</p>
              </div>
            </div>
            <PillBars
              height={90}
              data={o.sleep.series.slice(-7).map((s) => ({ label: weekday.format(s.date).replace(".", ""), value: s.log?.hours ?? null }))}
              format={(v) => formatHours(v)}
            />
          </div>
        )}
      </GlassCard>

      {/* Cardio */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <CardLabel icon={<HeartPulse />} className="flex-1">
            Cardio da semana
          </CardLabel>
          <p className="font-mono text-xs text-chumbo-100/70">
            {o.cardio.week.minutes}
            {o.cardio.week.targetMinutes ? `/${o.cardio.week.targetMinutes}` : ""} min
          </p>
        </div>
        <CardioTracker
          prescriptions={(r?.cardio ?? []).map((p, i) => ({ ...p, done: o.cardio.week.perPrescription[i]?.done ?? 0 }))}
          logs={o.cardio.logs.map((l) => ({ ...l, dayLabel: l.date.getTime() === o.today.getTime() ? "Hoje" : formatDay(l.date) }))}
        />
      </section>

      {/* Mobilidade */}
      {r && r.mobility.length > 0 && (
        <GlassCard className="flex flex-col gap-4">
          <CardLabel icon={<StretchHorizontal />}>Mobilidade{r.mobilityPerWeek ? ` · ${r.mobilityPerWeek}× por semana` : ""}</CardLabel>
          <MobilityRoutine
            drills={r.mobility}
            notes={r.mobilityNotes}
            doneToday={o.mobility.doneToday}
            daysThisWeek={o.mobility.daysThisWeek}
            target={o.mobility.target}
          />
        </GlassCard>
      )}
    </>
  );
}
