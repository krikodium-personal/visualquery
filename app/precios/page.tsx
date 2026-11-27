import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getLang } from "@/lib/i18n";
import { fill, getContent } from "@/components/marketing/content";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Sections";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { EXTRA_AI_CREDITS_PRICE_PER_1000_USD, EXTRA_RESPONSES_PRICE_PER_1000_USD } from "@/lib/plans";

export async function generateMetadata(): Promise<Metadata> {
  const t = getContent(await getLang()).pricing;
  return { title: t.metaTitle, description: t.metaDescription };
}

/** Only same-site survey pages are valid «volver» targets. */
function safeSurveyPath(value: string | string[] | undefined): string | null {
  const path = Array.isArray(value) ? value[0] : value;
  return path && /^\/surveys\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/.test(path) ? path : null;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const lang = await getLang();
  const content = getContent(lang);
  const t = content.pricing;
  const nav = content.nav;
  const backToSurvey = session?.user ? safeSurveyPath((await searchParams).from) : null;
  return (
    <div lang={lang} className="flex min-h-svh flex-col bg-background text-foreground">
      <MarketingNav
        loggedIn={Boolean(session?.user)}
        lang={lang}
        t={nav}
        current="pricing"
        back={backToSurvey ? { href: backToSurvey, label: t.backToSurvey } : undefined}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-3 text-muted-foreground">{t.intro}</p>
        </div>

        <PricingPlans loggedIn={Boolean(session?.user)} t={t} />

        <section className="grid gap-8 rounded-xl border bg-muted/20 p-6 md:grid-cols-2">
          <div>
            <h2 className="font-semibold">{t.extraTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {fill(t.extraText, {
                price: EXTRA_RESPONSES_PRICE_PER_1000_USD,
                ai: EXTRA_AI_CREDITS_PRICE_PER_1000_USD,
              })}
            </p>
          </div>
          <div>
            <h2 className="font-semibold">{t.soonTitle}</h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {t.soon.map((item) => (
                <li key={item} className="rounded-full border bg-background px-3 py-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">{t.note}</p>
      </main>
      <MarketingFooter t={content.footer} />
    </div>
  );
}
