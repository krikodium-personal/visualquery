"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** iOS-style Light ↔ Dark switch for the builder/platform chrome. */
export function BuilderThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Sun className="size-3.5 text-muted-foreground" aria-hidden />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        disabled={!mounted}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      />
      <Moon className="size-3.5 text-muted-foreground" aria-hidden />
      <Label className="sr-only">Tema de la plataforma</Label>
    </div>
  );
}
