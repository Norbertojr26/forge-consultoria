import { CheckInForm } from "@/components/aluno/checkin-form";
import { PageTitle } from "@/components/aluno/page-title";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { trySignedReadUrl } from "@/lib/storage";
import { addDaysUtc, formatDay, weekOf } from "@/lib/week";

export const metadata = { title: "Check-in · FORGE" };

export default async function CheckInPage() {
  const user = await requireUser();
  const week = weekOf();
  const existing = await db.checkIn.findUnique({
    where: { userId_weekOf: { userId: user.id, weekOf: week } },
  });
  const [front, back] = await Promise.all([
    trySignedReadUrl(existing?.photoFront),
    trySignedReadUrl(existing?.photoBack),
  ]);

  return (
    <>
      <PageTitle
        index="01"
        eyebrow={`Semana ${formatDay(week)} — ${formatDay(addDaysUtc(week, 6))}`}
        title={existing ? "Editar check-in" : "Check-in semanal"}
      />
      <CheckInForm
        defaultValues={{
          weightKg: existing ? String(existing.weightKg).replace(".", ",") : "",
          mood: existing ? String(existing.mood) : "",
          notes: existing?.notes ?? "",
        }}
        currentPhotos={{ front, back }}
      />
    </>
  );
}
