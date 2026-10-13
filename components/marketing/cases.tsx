import Image from "next/image";
import { Container } from "@/components/brand/container";
import { SectionHeader } from "@/components/brand/section-header";
import { cases } from "@/lib/content";

export function Cases() {
  return (
    <section id="cases" className="scroll-mt-16 border-y bg-chumbo-900 py-24 md:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeader
          index="02"
          eyebrow="Cases"
          title={<>Resultado<br />medido.</>}
          description="Números registrados no check-in semanal dos alunos."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((item, i) => (
            <li key={item.name} className="flex flex-col border bg-black">
              {item.image && (
                <div className="relative aspect-[4/5] border-b">
                  <Image
                    src={item.image}
                    alt={`Evolução de ${item.name}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between font-mono text-xs tracking-[0.12em] uppercase">
                  <span className="text-orange">{item.goal}</span>
                  <span className="text-chumbo-100">
                    /{String(i + 1).padStart(2, "0")} · {item.weeks} sem
                  </span>
                </div>
                <p className="font-display-forge text-5xl">{item.result}</p>
                <blockquote className="flex-1 text-sm text-chumbo-100">“{item.quote}”</blockquote>
                <p className="font-mono text-xs tracking-[0.12em] uppercase">{item.name}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
