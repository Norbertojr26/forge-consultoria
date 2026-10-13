import { cn } from "@/lib/utils";

/**
 * Imagem do exercício: usa a imagem própria (URL assinada do bucket) quando existe;
 * senão a foto real da Free Exercise DB (posição inicial/final).
 */
export function ExerciseImage({
  name,
  imageUrl,
  sourceId,
  frame = 0,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  sourceId?: string | null;
  frame?: 0 | 1;
  className?: string;
}) {
  const src = imageUrl ?? (sourceId ? `/exercises/${sourceId}/${frame}.jpg` : null);
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-chumbo-800", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- fotos estáticas ou URL assinada
        <img src={src} alt={`Execução: ${name}`} className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="grid size-full place-items-center label-mono">sem imagem</div>
      )}
      {!imageUrl && src && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      )}
    </div>
  );
}
