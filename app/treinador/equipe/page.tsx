import { TeamTable } from "@/components/treinador/team-table";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Equipe · FORGE" };

export default async function EquipePage() {
  const admin = await requireAdmin();
  const users = await db.user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true, trainerId: true },
  });
  const trainers = users.filter((u) => u.role !== "STUDENT").map((u) => ({ id: u.id, label: u.name ?? u.email }));

  return (
    <>
      <div>
        <p className="label-mono">Administração</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Equipe</h1>
        <p className="mt-2 max-w-2xl text-sm text-chumbo-100/60">
          Toda conta nova entra como aluno. Promova treinadores aqui e defina o treinador responsável por cada aluno; o treinador só vê e edita os próprios alunos.
        </p>
      </div>
      <TeamTable users={users} trainers={trainers} selfId={admin.id} />
    </>
  );
}
