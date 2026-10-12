import { PageTitle } from "@/components/aluno/page-title";
import { ProfileForm } from "@/components/aluno/profile-form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Perfil · FORGE" };

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <>
      <PageTitle index="03" eyebrow={user.email} title="Perfil" />
      <ProfileForm
        defaultValues={{
          name: user.name ?? "",
          birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
          heightCm: user.heightCm ? String(user.heightCm) : "",
          goal: user.goal ?? "",
        }}
      />
    </>
  );
}
