import { Container } from "@/components/brand/container";
import { SectionHeader } from "@/components/brand/section-header";
import { protocols } from "@/lib/content";

export function Protocols() {
  return (
    <section id="protocolos" className="scroll-mt-16 py-24 md:py-32">
      <Container className="flex flex-col gap-14">
        <SectionHeader
          index="03"
          eyebrow="Protocolos"
          title={<>Um objetivo.<br />Um protocolo.</>}
          description="Cada aluno entra em uma linha de protocolo e recebe a versão individual dela."
        />
        <ul className="grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {protocols.map((protocol, i) => (
            <li
              key={protocol.code}
              className="group relative flex flex-col gap-8 overflow-hidden bg-black p-6 md:p-8"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-orange transition-transform duration-300 group-hover:scale-x-100"
              />
              <div className="flex items-center justify-between font-mono text-xs tracking-[0.12em] uppercase">
                <span className="border border-orange/40 px-2 py-1 text-orange">{protocol.code}</span>
                <span className="text-chumbo-100">/{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="font-display-forge text-2xl">{protocol.title}</h3>
                <p className="text-sm text-chumbo-100">{protocol.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
