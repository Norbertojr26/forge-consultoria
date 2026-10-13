import { Container } from "@/components/brand/container";
import { SectionHeader } from "@/components/brand/section-header";
import { pillars } from "@/lib/content";

export function Methodology() {
  return (
    <section id="metodologia" className="scroll-mt-16 py-24 md:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeader
          index="01"
          eyebrow="Metodologia"
          title={<>4 pilares.<br />Zero achismo.</>}
          description="Um ciclo que se repete toda semana até a meta: medir, decidir, ajustar."
        />
        <ol className="grid border-t border-l sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, i) => (
            <li
              key={pillar.title}
              className="group flex min-h-64 flex-col justify-between gap-10 border-r border-b bg-chumbo-900 p-6 transition-colors hover:bg-chumbo-800 md:p-8"
            >
              <span className="font-mono text-xs tracking-[0.12em] text-chumbo-100 uppercase">
                Pilar {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="font-display-forge text-2xl transition-colors group-hover:text-orange">
                  {pillar.title}
                </h3>
                <p className="text-sm text-chumbo-100">{pillar.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
