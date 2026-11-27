"use client";

import { useTransition } from "react";
import { setLanguage } from "@/actions/language";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: "es", label: "ES", name: "Español" },
  { lang: "en", label: "EN", name: "English" },
];

export function LanguageSwitcher({ current }: { current: Lang }) {
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Language / Idioma" className="flex items-center rounded-full border p-0.5 text-xs">
      {OPTIONS.map(({ lang, label, name }) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          title={name}
          aria-pressed={current === lang}
          disabled={pending}
          onClick={() => current !== lang && start(() => setLanguage(lang))}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium transition-colors",
            current === lang ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
