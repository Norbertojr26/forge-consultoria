import { Eyebrow } from "@/components/brand/eyebrow";
import { requireUser } from "@/lib/auth";

// Placeholder da fase 1 — dashboard real entra na fase 3.
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-4">
      <Eyebrow index="00">Dashboard</Eyebrow>
      <h1 className="font-display-forge text-4xl">
        Olá, {user.name ?? user.email}
      </h1>
    </div>
  );
}
