import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Content } from "@/components/marketing/content";
import { LanguageSwitcher } from "@/components/marketing/LanguageSwitcher";
import type { Lang } from "@/lib/i18n";

export function MarketingNav({
  loggedIn,
  lang,
  t,
  current = "home",
  back,
}: {
  loggedIn: boolean;
  lang: Lang;
  t: Content["nav"];
  /** Page being shown: on other pages the section links point back to the home page. */
  current?: "home" | "pricing";
  /** Optional «volver» button (e.g. back to the survey the visitor came from). */
  back?: { href: string; label: string };
}) {
  const base = current === "home" ? "" : "/";
  const links = [
    { href: `${base}#como-funciona`, label: t.how },
    { href: `${base}#funciones`, label: t.features },
    { href: "/precios", label: t.plans, active: current === "pricing" },
    { href: `${base}#preguntas`, label: t.faq },
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Visualquery
        </Link>
        <nav aria-label={t.mainNav} className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? "page" : undefined}
              className={link.active ? "font-medium text-foreground" : "hover:text-foreground"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher current={lang} />
          {back ? (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={back.href}>{back.label}</Link>} />
          ) : null}
          {loggedIn ? (
            <Button size="sm" nativeButton={false} render={<Link href="/dashboard">{t.mySurveys}</Link>} />
          ) : (
            <>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login">{t.login}</Link>} />
              <Button size="sm" nativeButton={false} render={<Link href="/signup">{t.start}</Link>} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
