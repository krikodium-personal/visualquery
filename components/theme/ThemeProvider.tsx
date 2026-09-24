"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Builder/platform UI theme only — survey appearance uses Design colorMode. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="visualquery-ui-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
