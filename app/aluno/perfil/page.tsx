import { PageTitle } from "@/components/aluno/page-title";
import { ProfileForm } from "@/components/aluno/profile-form";
import { StravaConnect } from "@/components/aluno/strava-connect";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Perfil · FORGE" };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string; reason?: string }>;
}) {
  const user = await requireUser();
  const { strava, reason } = await searchParams;
  const stravaConnection = await db.stravaConnection.findUnique({
    where: { userId: user.id },
    select: { firstName: true, lastName: true, profilePicture: true, lastSyncAt: true },
  });

  return (
    <>
      <PageTitle index="03" eyebrow={user.email} title="Perfil" />
      <ProfileForm
        defaultValues={{
          name: user.name ?? "",
          birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
          heightCm: user.heightCm ? String(user.heightCm) : "",
          goal: user.goal ?? "",
          sex: user.sex ?? "",
        }}
      />
      <section className="max-w-2xl">
        <h2 className="label-mono mb-4 text-orange">Integrações</h2>
        <StravaConnect connection={stravaConnection} status={strava} reason={reason} />
      </section>
    </>
  );
}
