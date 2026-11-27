import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { getContent } from "@/components/marketing/content";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = getContent(await getLang());
  return { title: t.meta.homeTitle, description: t.meta.homeDescription };
}

export default async function Home() {
  const session = await auth();
  const loggedIn = Boolean(session?.user);
  const lang = await getLang();
  const t = getContent(lang);

  return (
    <div lang={lang} className="flex flex-1 flex-col">
      <MarketingNav loggedIn={loggedIn} lang={lang} t={t.nav} />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-14 md:pt-28">
          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-balance md:text-7xl md:leading-[1.02]">
            {t.hero.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">{t.hero.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href={loggedIn ? "/dashboard" : "/signup"}>{loggedIn ? t.nav.mySurveys : t.nav.start}</Link>}
            />
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="#como-funciona">{t.hero.secondary}</Link>} />
          </div>
        </section>

        <div className="border-y bg-muted/40 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] py-10">
          <HeroCanvas t={t.canvas} />
        </div>

        <BenefitsSection t={t.benefits} />
        <HowItWorks t={t.how} />
        <Features t={t.features} />
        <QuestionTypes t={t.types} />
        <UseCases t={t.cases} />
        <PricingTeaser t={t.teaser} plans={t.pricing.plans} />
        <Faq t={t.faq} />
      </main>
      <FinalCta loggedIn={loggedIn} t={t.finalCta} nav={t.nav} />
      <MarketingFooter t={t.footer} />
    </div>
  );
}
