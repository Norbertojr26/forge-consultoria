import { Container } from "@/components/brand/container";
import { SectionHeader } from "@/components/brand/section-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faq } from "@/lib/content";

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 py-24 md:py-32">
      <Container className="grid gap-14 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeader
          index="05"
          eyebrow="FAQ"
          title={<>Dúvidas<br />frequentes.</>}
          className="self-start md:flex-col md:items-start lg:sticky lg:top-24"
        />
        <Accordion type="single" collapsible className="border-t">
          {faq.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger className="gap-6 py-6 text-base hover:no-underline md:text-lg [&[data-state=open]]:text-orange">
                <span className="flex gap-4">
                  <span className="pt-1 font-mono text-xs text-chumbo-100">/{String(i + 1).padStart(2, "0")}</span>
                  {item.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pl-10 text-chumbo-100">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
