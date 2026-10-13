"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Seletor de foto com preview. `currentUrl` mostra a foto já enviada nesta semana. */
export function PhotoInput({
  label,
  file,
  currentUrl,
  onChange,
  disabled,
}: {
  label: string;
  file: File | null;
  currentUrl?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? currentUrl ?? null;

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">{label}</span>
      <div className="relative">
        <label
          htmlFor={id}
          className={cn(
            "flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden border border-dashed bg-chumbo-900 text-chumbo-100 transition-colors hover:border-orange hover:text-white",
            shown && "border-solid",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob/URL assinada, sem otimização do next/image
            <img src={shown} alt={`Prévia: ${label}`} className="size-full object-cover" />
          ) : (
            <>
              <Camera className="size-6" aria-hidden />
              <span className="text-sm">Adicionar foto</span>
            </>
          )}
        </label>
        {file && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 flex size-8 items-center justify-center bg-black/80 text-white hover:text-orange"
            aria-label={`Remover ${label}`}
          >
            <X className="size-4" />
          </button>
        )}
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
      {currentUrl && !file && <span className="text-xs text-chumbo-100">Já enviada. Toque para trocar.</span>}
    </div>
  );
}
