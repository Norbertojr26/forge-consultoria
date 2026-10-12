"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile } from "@/lib/actions/profile";
import { GOALS, type ProfileInput, profileSchema } from "@/lib/validations";

const labelClass = "font-mono text-xs tracking-[0.12em] uppercase";

export function ProfileForm({ defaultValues }: { defaultValues: ProfileInput }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues });

  function onSubmit(values: ProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        toast.success("Perfil atualizado.");
        form.reset(values);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-8 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className={labelClass}>Nome</FormLabel>
              <FormControl>
                <Input autoComplete="name" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Data de nascimento</FormLabel>
              <FormControl>
                <Input type="date" autoComplete="bday" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="heightCm"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Altura (cm)</FormLabel>
              <FormControl>
                <Input inputMode="numeric" placeholder="178" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel className={labelClass}>Objetivo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GOALS.map((goal) => (
                    <SelectItem key={goal.value} value={goal.value}>
                      {goal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          disabled={pending || !form.formState.isDirty}
          className="h-12 justify-self-start px-8 font-mono uppercase md:col-span-2"
        >
          {pending ? "Salvando…" : "Salvar perfil"}
        </Button>
      </form>
    </Form>
  );
}
