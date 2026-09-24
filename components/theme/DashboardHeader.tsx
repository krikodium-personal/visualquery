"use client";

import { BuilderThemeSwitch } from "@/components/theme/BuilderThemeSwitch";

/** Client island for the builder theme control in the dashboard header. */
export function DashboardHeaderActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <BuilderThemeSwitch />
      {children}
    </div>
  );
}
