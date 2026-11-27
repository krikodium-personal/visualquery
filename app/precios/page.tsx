import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { fill, getContent } from "@/components/marketing/content";
import { LanguageSwitcher } from "@/components/marketing/LanguageSwitcher";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { EXTRA_RESPONSE_PRICE_USD } from "@/lib/plans";

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
    <div lang={lang} className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href={session?.user ? "/dashboard" : "/"} className="font-semibold">
            Visualquery
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher current={lang} />
            {session?.user ? (
              <>
                {backToSurvey ? (
                  <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={backToSurvey}>{t.backToSurvey}</Link>} />
                ) : null}
                <Button size="sm" nativeButton={false} render={<Link href="/dashboard">{nav.mySurveys}</Link>} />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login">{nav.login}</Link>} />
                <Button size="sm" nativeButton={false} render={<Link href="/signup">{content.footer.signup}</Link>} />
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="mt-3 text-muted-foreground">{t.intro}</p>
        </div>

        <PricingPlans loggedIn={Boolean(session?.user)} t={t} />

        <section className="grid gap-8 rounded-xl border bg-muted/20 p-6 md:grid-cols-2">
          <div>
            <h2 className="font-semibold">{t.extraTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {fill(t.extraText, { price: EXTRA_RESPONSE_PRICE_USD.toFixed(2) })}
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
    </div>
  );
}
