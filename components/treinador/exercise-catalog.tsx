"use client";

import { Check, Crown, Film, ImageUp, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExerciseImage } from "@/components/app/exercise-image";
import { approveExerciseArt, discardExerciseArt, generateExerciseArt, setStyleReference } from "@/lib/actions/exercise-art";
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
  imageUrlEnd: string | null;
  hasManualImage: boolean;
  videoUrl: string | null;
  hasManualVideo: boolean;
  /** Imagens FORGE por versão do personagem: aprovada (alunos veem) e proposta (só a equipe). */
  arts: Record<Sex, { approved: ArtView | null; candidate: ArtView | null }>;
};

export type ArtView = { startUrl: string | null; endUrl: string | null };
type Sex = "MALE" | "FEMALE";
type StyleRefs = Record<Sex, string | null>;
const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "MALE", label: "Masculino" },
  { value: "FEMALE", label: "Feminino" },
];

const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-orange/60";

export function ExerciseCatalog({ rows, styleRefs, aiEnabled }: { rows: CatalogRow[]; styleRefs: StyleRefs; aiEnabled: boolean }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const editingRow = editing && editing !== "new" ? rows.find((r) => r.id === editing) ?? null : null;
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
              <ExerciseImage name={ex.name} imageUrl={ex.imageUrl} imageUrlEnd={ex.imageUrlEnd} videoUrl={ex.videoUrl} sourceId={ex.sourceId} className="aspect-square w-full" />
              {ex.arts.MALE.candidate || ex.arts.FEMALE.candidate ? (
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-orange px-2 py-0.5 text-[0.6rem] text-black">
                  <Sparkles className="size-3" /> aguardando aprovação
                </span>
              ) : !ex.imageUrl && (
                <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.6rem] text-chumbo-100/80">foto de referência</span>
              )}
            </div>
            <div className="flex items-start justify-between gap-2 px-1 pb-1">
              <div className="min-w-0">
                <p className="text-sm leading-tight">{ex.name}</p>
                <p className="mt-0.5 text-[0.65rem] text-chumbo-100/50 uppercase">{muscleLabel(ex.muscleGroup)}</p>
              </div>
              <button type="button" onClick={() => setEditing(ex.id)} className="shrink-0 p-1 text-chumbo-100/50 hover:text-white" aria-label={`Editar ${ex.name}`}>
                <Pencil className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (editing === "new" || editingRow) && (
        <ExerciseForm key={editing} row={editingRow} styleRefs={styleRefs} aiEnabled={aiEnabled} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function ExerciseForm({
  row,
  styleRefs,
  aiEnabled,
  onClose,
}: {
  row: CatalogRow | null;
  styleRefs: StyleRefs;
  aiEnabled: boolean;
  onClose: () => void;
}) {
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
        {row && <ArtPanel row={row} styleRefs={styleRefs} aiEnabled={aiEnabled} />}
        {row && <VideoPanel row={row} />}
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

function Pair({ label, start, end, empty, highlight }: { label: string; start?: string | null; end?: string | null; empty?: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.65rem] text-chumbo-100/60 uppercase">{label}</span>
      {start ? (
        <div className="grid grid-cols-2 gap-2">
          {[start, end].map((src, i) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada / foto estática
              <img key={i} src={src} alt={`${label} — ${i === 0 ? "início" : "fim"}`} className={cn("aspect-[3/2] w-full rounded-xl bg-black object-cover", highlight && "ring-1 ring-orange/60")} />
            ) : (
              <div key={i} className="aspect-[3/2] w-full rounded-xl bg-white/[0.03]" />
            ),
          )}
        </div>
      ) : (
        <div className="grid h-20 w-full place-items-center rounded-xl border border-dashed border-white/10 px-3 text-center text-xs text-chumbo-100/50">{empty}</div>
      )}
    </div>
  );
}

const pillBtn = "flex items-center justify-center gap-1.5 rounded-full py-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] disabled:opacity-60";

/** Imagens FORGE do exercício: referência real, proposta da IA e aprovada, por versão do personagem. */
function ArtPanel({ row, styleRefs, aiEnabled }: { row: CatalogRow; styleRefs: StyleRefs; aiEnabled: boolean }) {
  const router = useRouter();
  const [sex, setSex] = useState<Sex>("MALE");
  const [pending, start] = useTransition();
  const { approved, candidate } = row.arts[sex];
  const styleRef = styleRefs[sex];

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.error ?? "Erro");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="label-mono">Imagem FORGE</span>
        <div className="flex rounded-full border border-white/10 p-0.5">
          {SEX_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSex(o.value)}
              className={cn("relative rounded-full px-3 py-1 text-xs", sex === o.value ? "bg-white/10 text-white" : "text-chumbo-100/60")}
            >
              {o.label}
              {row.arts[o.value].candidate && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-orange" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2 text-xs text-chumbo-100/70">
        {styleRef ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada
          <img src={styleRef} alt="Personagem-mestre" className="h-10 w-14 rounded-lg object-cover" />
        ) : (
          <Crown className="mx-2 size-4 text-chumbo-100/40" />
        )}
        <span>
          {styleRef
            ? "Personagem-mestre definido: toda geração copia este estilo."
            : "Sem personagem-mestre. Quando sair uma imagem perfeita, toque em “Mestre” para fixar o estilo nas próximas."}
        </span>
      </div>

      {row.hasManualImage && (
        <p className="text-xs text-orange">Este exercício tem imagem enviada manualmente — ela tem prioridade sobre a imagem FORGE.</p>
      )}

      {row.sourceId ? (
        <Pair label="Foto de referência (pose e ângulo)" start={`/exercises/${row.sourceId}/0.jpg`} end={`/exercises/${row.sourceId}/1.jpg`} />
      ) : (
        <p className="text-xs text-chumbo-100/50">Sem foto de referência: a geração por IA precisa dela para copiar a pose.</p>
      )}

      <Pair
        label="Proposta da IA"
        start={candidate?.startUrl}
        end={candidate?.endUrl}
        highlight
        empty={pending ? "Gerando início e fim… (até 1 min)" : "Nenhuma proposta"}
      />
      {candidate ? (
        <div className="grid grid-cols-4 gap-2">
          <button type="button" disabled={pending} onClick={() => run(() => approveExerciseArt(row.id, sex), "Imagem aprovada")} className={cn(pillBtn, "bg-orange text-black")}>
            <Check className="size-3.5" /> Aprovar
          </button>
          <button type="button" disabled={pending || !aiEnabled} onClick={() => run(() => generateExerciseArt(row.id, sex), "Nova proposta gerada")} className={cn(pillBtn, "border border-white/15")}>
            <Sparkles className="size-3.5" /> {pending ? "…" : "Outra"}
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setStyleReference(row.id, sex, false), "Personagem-mestre definido")} className={cn(pillBtn, "border border-white/15")}>
            <Crown className="size-3.5" /> Mestre
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => discardExerciseArt(row.id, sex), "Proposta descartada")} className={cn(pillBtn, "border border-white/15 text-chumbo-100/70")}>
            <Trash2 className="size-3.5" /> Descartar
          </button>
        </div>
      ) : aiEnabled ? (
        <button
          type="button"
          disabled={pending || !row.sourceId}
          onClick={() => run(() => generateExerciseArt(row.id, sex), "Proposta gerada — confira e aprove")}
          className="flex items-center justify-center gap-2 rounded-full border border-orange/50 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-orange hover:bg-orange/10 disabled:opacity-60"
        >
          <Sparkles className="size-4" /> {pending ? "Gerando…" : `Gerar versão ${sex === "MALE" ? "masculina" : "feminina"}`}
        </button>
      ) : (
        <p className="text-xs text-chumbo-100/50">Geração por IA desativada: defina OPENROUTER_API_KEY no Railway.</p>
      )}

      <Pair label="Aprovada (alunos veem)" start={approved?.startUrl} end={approved?.endUrl} empty="Nenhuma aprovada — alunos veem a foto de referência" />
      {approved && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={pending} onClick={() => run(() => setStyleReference(row.id, sex, true), "Personagem-mestre definido")} className={cn(pillBtn, "border border-white/15")}>
            <Crown className="size-3.5" /> Usar como mestre
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm("Remover a imagem aprovada? Os alunos voltam a ver a foto de referência.") && run(() => discardExerciseArt(row.id, sex, true), "Imagem removida")}
            className={cn(pillBtn, "border border-white/15 text-chumbo-100/70")}
          >
            <Trash2 className="size-3.5" /> Remover
          </button>
        </div>
      )}
    </div>
  );
}

/** Vídeo de execução do exercício: o treinador grava e envia (MP4/MOV/WebM até 60 MB). */
function VideoPanel({ row }: { row: CatalogRow }) {
  const router = useRouter();
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, start] = useTransition();

  function upload(file: File) {
    if (file.size > 60 * 1024 * 1024) return void toast.error("Vídeo acima de 60 MB. Corte ou comprima antes de enviar.");
    // XHR para mostrar o progresso do envio (fetch não expõe upload progress)
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/exercicios/${row.id}/video`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success("Vídeo enviado");
        router.refresh();
      } else {
        let msg = "Falha ao enviar o vídeo";
        try {
          msg = JSON.parse(xhr.responseText).error ?? msg;
        } catch {}
        toast.error(msg);
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      toast.error("Falha de conexão ao enviar o vídeo");
    };
    setProgress(0);
    xhr.send(file);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4">
      <span className="label-mono flex items-center gap-2">
        <Film className="size-4 text-orange" /> Vídeo de execução
      </span>
      {row.videoUrl ? (
        <video src={row.videoUrl} controls muted loop playsInline className="aspect-video w-full rounded-xl bg-black object-contain" />
      ) : (
        <p className="text-xs text-chumbo-100/60">
          Sem vídeo: o aluno vê as imagens (início e fim alternando). Um vídeo curto em loop (5–15 s, sem som) deixa a execução mais clara.
        </p>
      )}
      {row.videoUrl && !row.hasManualVideo && <p className="text-xs text-chumbo-100/60">Este é o clipe gerado por IA. Enviar um vídeo próprio substitui para os alunos.</p>}
      {progress != null && (
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className={cn(pillBtn, "cursor-pointer border border-orange/50 px-4 text-orange hover:bg-orange/10", progress != null && "pointer-events-none opacity-60")}>
          <ImageUp className="size-3.5" /> {progress != null ? `Enviando ${progress}%` : row.hasManualVideo ? "Trocar vídeo" : "Enviar vídeo"}
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
        </label>
        {row.hasManualVideo && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              confirm("Remover o vídeo deste exercício?") &&
              start(async () => {
                const r = await fetch(`/api/exercicios/${row.id}/video`, { method: "DELETE" });
                if (r.ok) toast.success("Vídeo removido");
                else toast.error("Não foi possível remover");
                router.refresh();
              })
            }
            className={cn(pillBtn, "border border-white/15 px-4 text-chumbo-100/70")}
          >
            <Trash2 className="size-3.5" /> Remover
          </button>
        )}
      </div>
    </div>
  );
}
