import { Check } from "lucide-react";
import { Container } from "@/components/brand/container";
import { SectionHeader } from "@/components/brand/section-header";
import { Button } from "@/components/ui/button";
import { APPLY_URL, plans } from "@/lib/content";
import { cn } from "@/lib/utils";

export function Plans() {
  return (
    <section id="planos" className="scroll-mt-16 border-y bg-chumbo-900 py-24 md:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeader
          index="04"
          eyebrow="Planos"
          title={<>Escolha o<br />nível.</>}
          description="Todos os planos incluem a área do aluno com check-in semanal e gráfico de evolução."
        />
        <ul className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <li
              key={plan.name}
              className={cn(
                "relative flex flex-col gap-8 border bg-black p-6 md:p-8",
                plan.highlight && "border-orange lg:-my-4 lg:py-12"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 bg-orange px-2 py-1 font-mono text-[0.65rem] tracking-[0.12em] text-black uppercase">
                  Mais escolhido
                </span>
              )}
              <div className="flex flex-col gap-4">
                <h3 className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">{plan.name}</h3>
                <p className="flex items-baseline gap-1">
                  <span className="font-display-forge text-5xl">{plan.price}</span>
                  <span className="text-sm text-chumbo-100">{plan.period}</span>
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-3 border-t pt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                size="lg"
                variant={plan.highlight ? "default" : "outline"}
                className="font-mono uppercase"
              >
                <a href={APPLY_URL} target="_blank" rel="noopener noreferrer">
                  Aplicar para o {plan.name}
                </a>
              </Button>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
