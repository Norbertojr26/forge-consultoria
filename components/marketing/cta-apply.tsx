import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/brand/container";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import { APPLY_URL, ctaFinal } from "@/lib/content";

export function CtaApply() {
  return (
    <section id="aplicar" className="scroll-mt-16 bg-orange text-black">
      <Container className="flex flex-col gap-10 py-24 md:flex-row md:items-end md:justify-between md:py-32">
        <div className="flex flex-col gap-6">
          <Eyebrow index="06" className="text-black [&>span:first-child]:text-black/60">
            {ctaFinal.eyebrow}
          </Eyebrow>
          <h2 className="font-display-forge text-5xl md:text-8xl">{ctaFinal.title}</h2>
          <p className="max-w-md text-black/75">{ctaFinal.text}</p>
        </div>
        <Button
          asChild
          size="lg"
          className="h-14 bg-black px-8 font-mono text-white uppercase hover:bg-chumbo-800"
        >
          <a href={APPLY_URL} target="_blank" rel="noopener noreferrer">
            Aplicar <ArrowUpRight />
          </a>
        </Button>
      </Container>
    </section>
  );
}
