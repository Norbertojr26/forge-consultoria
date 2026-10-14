import { CheckInForm } from "@/components/aluno/checkin-form";
import { PageTitle } from "@/components/aluno/page-title";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeMetrics, currentCycleCheckIn, frequencyLabel } from "@/lib/metrics";
import { trySignedReadUrl } from "@/lib/storage";
import { MEASURES } from "@/lib/validations";
import { formatDay } from "@/lib/week";

export const metadata = { title: "Check-in · FORGE" };

const str = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

export default async function CheckInPage() {
  const user = await requireUser();
  const history = await db.checkIn.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 8 });
  const existing = currentCycleCheckIn(history, new Date(), user.checkInEveryDays);
  const m = computeMetrics(history, new Date(), user.checkInEveryDays);
  // Medidas: sugere as últimas informadas para o aluno só ajustar
  const lastMeasures = history.find((c) => MEASURES.some((x) => c[x.key] != null));
  const [front, back] = await Promise.all([trySignedReadUrl(existing?.photoFront), trySignedReadUrl(existing?.photoBack)]);

  const eyebrow = existing
    ? `${frequencyLabel(user.checkInEveryDays)} · enviado em ${formatDay(existing.date)}`
    : m.nextCheckIn.overdue
      ? `${frequencyLabel(user.checkInEveryDays)} · atrasado desde ${formatDay(m.nextCheckIn.dueBy)}`
      : `${frequencyLabel(user.checkInEveryDays)} · até ${formatDay(m.nextCheckIn.dueBy)}`;

  return (
    <>
      <PageTitle index="01" eyebrow={eyebrow} title={existing ? "Editar check-in" : "Check-in"} />
      <CheckInForm
        defaultValues={{
          weightKg: existing ? str(existing.weightKg) : "",
          mood: existing ? String(existing.mood) : "",
          notes: existing?.notes ?? "",
          ...(Object.fromEntries(MEASURES.map((x) => [x.key, str((existing ?? lastMeasures)?.[x.key])])) as Record<(typeof MEASURES)[number]["key"], string>),
        }}
        currentPhotos={{ front, back }}
        measuresOpen={!!lastMeasures}
      />
    </>
  );
}
