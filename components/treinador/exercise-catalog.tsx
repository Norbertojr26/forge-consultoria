"use client";

import { ImageUp, Pencil, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExerciseImage } from "@/components/app/exercise-image";
import { saveExercise, uploadExerciseImage } from "@/lib/actions/trainer";
import { MUSCLE_GROUPS, muscleLabel } from "@/lib/exercises";
import { cn } from "@/lib/utils";

export type CatalogRow = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  instructions: string | null;
  sourceId: string | null;
  imageUrl: string | null;
};

const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-orange/60";

export function ExerciseCatalog({ rows }: { rows: CatalogRow[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogRow | "new" | null>(null);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const list = rows.filter((e) => (!group || e.muscleGroup === group) && (!q || norm(e.name).includes(norm(q))));

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-chumbo-100/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar exercício" className={cn(inputCls, "pl-9")} />
        </label>
        <button type="button" onClick={() => setEditing("new")} className="glow flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-black">
          <Plus className="size-4" /> Novo exercício
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ value: null, label: `Todos (${rows.length})` }, ...MUSCLE_GROUPS].map((m) => (
          <button
            key={m.value ?? "all"}
            type="button"
            onClick={() => setGroup(m.value)}
            className={cn("shrink-0 rounded-full border px-3 py-1 text-xs", group === m.value ? "border-orange bg-orange/15 text-orange" : "border-white/10 text-chumbo-100/70 hover:border-white/30")}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {list.map((ex) => (
          <li key={ex.id} className="glass group flex flex-col gap-2 rounded-3xl p-2">
            <div className="relative">
              <ExerciseImage name={ex.name} imageUrl={ex.imageUrl} sourceId={ex.sourceId} className="aspect-square w-full" />
              {!ex.imageUrl && (
                <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.6rem] text-chumbo-100/80">foto de referência</span>
              )}
            </div>
            <div className="flex items-start justify-between gap-2 px-1 pb-1">
              <div className="min-w-0">
                <p className="text-sm leading-tight">{ex.name}</p>
                <p className="mt-0.5 text-[0.65rem] text-chumbo-100/50 uppercase">{muscleLabel(ex.muscleGroup)}</p>
              </div>
              <button type="button" onClick={() => setEditing(ex)} className="shrink-0 p-1 text-chumbo-100/50 hover:text-white" aria-label={`Editar ${ex.name}`}>
                <Pencil className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && <ExerciseForm row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ExerciseForm({ row, onClose }: { row: CatalogRow | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(row?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState(row?.muscleGroup ?? "peito");
  const [equipment, setEquipment] = useState(row?.equipment ?? "");
  const [instructions, setInstructions] = useState(row?.instructions ?? "");
  const [file, setFile] = useState<File | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveExercise(row?.id ?? null, {
        name,
        muscleGroup,
        equipment: equipment.trim() || null,
        instructions: instructions.trim() || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (file && r.id) {
        const fd = new FormData();
        fd.set("exerciseId", r.id);
        fd.set("image", file);
        const up = await uploadExerciseImage(fd);
        if (!up.ok) {
          toast.error(up.error);
          return;
        }
      }
      toast.success("Exercício salvo");
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-label="Exercício" onClick={onClose}>
      <form onSubmit={submit} className="glass flex max-h-[90svh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-[2rem] p-6 md:rounded-[2rem]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{row ? "Editar exercício" : "Novo exercício"}</h2>
          <button type="button" onClick={onClose} className="text-chumbo-100/60 hover:text-white" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label-mono">Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">Grupo muscular</span>
            <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} className={inputCls}>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m.value} value={m.value} className="bg-chumbo-900">
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-mono">Equipamento</span>
            <input value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputCls} placeholder="halter, polia…" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="label-mono">Como executar</span>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className={inputCls} />
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 p-4 text-sm text-chumbo-100/70 hover:border-orange/50">
          <ImageUp className="size-5 text-orange" />
          <span className="flex-1">{file ? file.name : row?.imageUrl ? "Trocar imagem própria" : "Enviar imagem própria (JPG, PNG ou WEBP, até 4 MB)"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="submit" disabled={pending} className="glow h-12 rounded-full bg-orange font-mono text-xs uppercase tracking-[0.14em] text-black disabled:opacity-60">
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
