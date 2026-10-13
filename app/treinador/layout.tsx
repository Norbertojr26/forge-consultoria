import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/brand/logo";
import { TrainerNav } from "@/components/treinador/trainer-nav";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TreinadorLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="app-backdrop min-h-svh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-6 border-b border-white/5 p-5 lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between">
          <div>
            <Logo href="/treinador" className="text-xl" />
            <p className="label-mono mt-1">{staff.role === "ADMIN" ? "Administração" : "Treinador"}</p>
          </div>
          <UserButton />
        </div>
        <TrainerNav isAdmin={staff.role === "ADMIN"} />
      </aside>
      <main className="flex min-w-0 flex-col gap-6 p-5 lg:p-10">{children}</main>
    </div>
  );
}
