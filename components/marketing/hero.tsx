import { ArrowDownRight } from "lucide-react";
import { Container } from "@/components/brand/container";
import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import { APPLY_URL, hero } from "@/lib/content";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-svh items-end overflow-hidden pt-16">
      <video
        className="absolute inset-0 -z-20 size-full object-cover opacity-50 motion-reduce:hidden"
        src={hero.video.src}
        poster={hero.video.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      />
      {/* Degradê garante contraste do texto com ou sem vídeo */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(255,91,20,0.18),transparent_55%),linear-gradient(to_top,var(--forge-black)_15%,rgba(10,10,10,0.55)_60%,rgba(10,10,10,0.85))]" />

      <Container className="flex flex-col gap-10 pb-14 md:pb-20">
        <Eyebrow index="00">{hero.eyebrow}</Eyebrow>
        <h1 className="font-display-forge text-[clamp(3.5rem,12vw,10rem)]">
          {hero.title[0]}
          <br />
          <span className="text-orange">{hero.title[1]}</span>
        </h1>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md text-lg text-chumbo-100">{hero.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="font-mono uppercase">
              <a href={APPLY_URL} target="_blank" rel="noopener noreferrer">
                Aplicar agora
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-mono uppercase">
              <a href="#metodologia">
                Como funciona <ArrowDownRight />
              </a>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 border-t border-white/10 pt-6">
          {hero.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="order-2 font-mono text-[0.65rem] tracking-[0.12em] text-chumbo-100 uppercase md:text-xs">
                {stat.label}
              </dt>
              <dd className="font-display-forge text-2xl md:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
