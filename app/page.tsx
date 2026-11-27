import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { HeroCanvas } from "@/components/marketing/HeroCanvas";
import { MarketingNav } from "@/components/marketing/Nav";
import {
  BenefitsSection,
  Faq,
  Features,
  FinalCta,
  HowItWorks,
  MarketingFooter,
  PricingTeaser,
  QuestionTypes,
  UseCases,
} from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Visualquery · Encuestas armadas como un mapa",
  description:
    "Creá encuestas con lógica condicional conectando preguntas como nodos en un canvas. Cada persona recorre solo el camino que le corresponde.",
};

export default async function Home() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);

  return (
    <div className="flex flex-1 flex-col">
      <MarketingNav loggedIn={loggedIn} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-14 md:pt-28">
          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-balance md:text-7xl md:leading-[1.02]">
            Armá tu encuesta como un mapa
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Cada pregunta es un nodo en un canvas. Conectá las respuestas con flechas y cada persona
            recorre solo el camino que le corresponde.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" nativeButton={false} render={<Link href={loggedIn ? "/dashboard" : "/signup"}>{loggedIn ? "Ir a mis encuestas" : "Empezar gratis"}</Link>} />
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="#como-funciona">Ver cómo funciona</Link>} />
          </div>
        </section>

        <div className="border-y bg-muted/40 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] py-10">
          <HeroCanvas />
        </div>

        <BenefitsSection />
        <HowItWorks />
        <Features />
        <QuestionTypes />
        <UseCases />
        <PricingTeaser />
        <Faq />
      </main>
      <FinalCta loggedIn={loggedIn} />
      <MarketingFooter />
    </div>
  );
}
