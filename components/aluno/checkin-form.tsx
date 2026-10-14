"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { compressImage } from "@/components/aluno/compress-image";
import { PhotoInput } from "@/components/aluno/photo-input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { submitCheckIn } from "@/lib/actions/checkin";
import { type CheckInInput, checkInSchema, MEASURES, MOODS } from "@/lib/validations";

export function CheckInForm({
  defaultValues,
  currentPhotos,
  measuresOpen = false,
}: {
  defaultValues: CheckInInput;
  currentPhotos: { front: string | null; back: string | null };
  measuresOpen?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);

  const form = useForm<CheckInInput>({
    resolver: zodResolver(checkInSchema),
    defaultValues,
  });

  function onSubmit(values: CheckInInput) {
    startTransition(async () => {
      const data = new FormData();
      data.set("weightKg", values.weightKg);
      data.set("mood", values.mood);
      data.set("notes", values.notes);
      for (const m of MEASURES) data.set(m.key, values[m.key]);

      try {
        if (front) data.set("photoFront", await compressImage(front));
        if (back) data.set("photoBack", await compressImage(back));
      } catch {
        toast.error("Não foi possível ler a foto. Tente outra imagem (JPG ou PNG).");
        return;
      }

      const result = await submitCheckIn(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Check-in salvo.");
      router.push("/aluno");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-10">
        <div className="grid gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="weightKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-xs tracking-[0.12em] uppercase">Peso (kg)</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="80,5"
                    autoComplete="off"
                    className="h-14 rounded-2xl num-thin text-3xl md:text-3xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-xs tracking-[0.12em] uppercase">Como foi a semana?</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                    className="grid h-14 w-full grid-cols-5"
                  >
                    {MOODS.map((mood) => (
                      <ToggleGroupItem
                        key={mood.value}
                        value={String(mood.value)}
                        aria-label={`${mood.value} — ${mood.label}`}
                        title={mood.label}
                        className="h-14 text-xl font-light data-[state=on]:glow data-[state=on]:bg-orange data-[state=on]:text-black"
                      >
                        {mood.value}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FormControl>
                <p className="flex justify-between font-mono text-[0.65rem] tracking-[0.12em] text-chumbo-100 uppercase">
                  <span>Péssima</span>
                  <span>Ótima</span>
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:max-w-xl">
          <PhotoInput label="Frente" file={front} currentUrl={currentPhotos.front} onChange={setFront} disabled={pending} />
          <PhotoInput label="Costas" file={back} currentUrl={currentPhotos.back} onChange={setBack} disabled={pending} />
        </div>

        <details open={measuresOpen} className="glass group rounded-3xl p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-xs tracking-[0.12em] uppercase">
            Medidas corporais (opcional)
            <span className="text-orange transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-xs text-chumbo-100/60">Meça sempre no mesmo horário, de preferência em jejum. Já vêm preenchidas com as últimas — ajuste o que mudou.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {MEASURES.map((m) => (
              <FormField
                key={m.key}
                control={form.control}
                name={m.key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-[0.65rem] tracking-[0.12em] uppercase">
                      {m.label} ({m.unit})
                    </FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" autoComplete="off" className="h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </details>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono text-xs tracking-[0.12em] uppercase">Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Treinos, fome, sono, algo fora da rotina…"
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={pending} className="h-12 self-start px-8 font-mono uppercase">
          {pending ? "Enviando…" : "Salvar check-in"}
        </Button>
      </form>
    </Form>
  );
}
