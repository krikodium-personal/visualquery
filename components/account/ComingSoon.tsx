import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Badge variant="secondary">Próximamente</Badge>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
