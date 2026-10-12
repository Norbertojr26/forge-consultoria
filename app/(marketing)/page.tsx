import { Cases } from "@/components/marketing/cases";
import { CtaApply } from "@/components/marketing/cta-apply";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { Methodology } from "@/components/marketing/methodology";
import { Plans } from "@/components/marketing/plans";
import { Protocols } from "@/components/marketing/protocols";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Methodology />
      <Cases />
      <Protocols />
      <Plans />
      <Faq />
      <CtaApply />
    </>
  );
}
