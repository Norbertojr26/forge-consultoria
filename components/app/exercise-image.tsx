import { cn } from "@/lib/utils";

/**
 * Imagem do exercício: usa a arte FORGE / imagem própria (URLs assinadas do bucket) quando existe;
 * senão a foto real da Free Exercise DB. frame 0 = posição inicial, 1 = final.
 */
export function ExerciseImage({
  name,
  imageUrl,
  imageUrlEnd,
  sourceId,
  frame = 0,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  imageUrlEnd?: string | null;
  sourceId?: string | null;
  frame?: 0 | 1;
  className?: string;
}) {
  const own = frame === 1 ? (imageUrlEnd ?? imageUrl) : imageUrl;
  const src = own ?? (sourceId ? `/exercises/${sourceId}/${frame}.jpg` : null);
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-chumbo-800", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- fotos estáticas ou URL assinada
        <img src={src} alt={`Execução: ${name}`} className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="grid size-full place-items-center label-mono">sem imagem</div>
      )}
      {!own && src && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      )}
    </div>
  );
}
