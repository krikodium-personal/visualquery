"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { SurveyOptionsInput } from "@/actions/survey-options";
import { cn } from "@/lib/utils";

export type OptionsState = SurveyOptionsInput;

export function OptionsPanel({
  value,
  onChange,
  onClose,
}: {
  value: OptionsState;
  onChange: (next: OptionsState) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<"list" | "progress">("list");
  const set = (patch: Partial<OptionsState>) => onChange({ ...value, ...patch });

  const showCount = value.progressDisplay === "questions" || value.progressDisplay === "both";
  const showPercent = value.progressDisplay === "percentage" || value.progressDisplay === "both";
  function setFormat(count: boolean, percent: boolean) {
    set({ progressDisplay: count && percent ? "both" : count ? "questions" : percent ? "percentage" : "bar" });
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-l bg-background",
        "w-full max-w-sm md:w-[320px]",
        "max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:shadow-xl",
      )}
      aria-label="Opciones de la encuesta"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        {view === "progress" ? (
          <button type="button" onClick={() => setView("list")} className="flex items-center gap-1 text-sm font-semibold">
            <ChevronLeft className="size-4" /> Barra de progreso
          </button>
        ) : (
          <p className="text-sm font-semibold">Opciones</p>
        )}
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Cerrar opciones">
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === "list" ? (
          <ul className="divide-y">
            <ToggleRow label="Título de la encuesta" hint="Muestra el título sobre cada pregunta." checked={value.showTitle} onChange={(v) => set({ showTitle: v })} />
            <li>
              <button type="button" onClick={() => setView("progress")} className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm hover:bg-muted/40">
                <span>Barra de progreso</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {value.showProgress ? "Activada" : "Desactivada"}
                  <ChevronRight className="size-4" />
                </span>
              </button>
            </li>
            <ToggleRow label="Números de las preguntas" hint="Antepone el número a cada pregunta." checked={value.showQuestionNumbers} onChange={(v) => set({ showQuestionNumbers: v })} />
            <ToggleRow label="Asteriscos de respuestas obligatorias" hint="Marca con * las preguntas obligatorias." checked={value.showRequiredAsterisk} onChange={(v) => set({ showRequiredAsterisk: v })} />
            <SoonRow label="Test" />
            <SoonRow label="Pago" />
            <SoonRow label="Idioma" detail="Español" />
          </ul>
        ) : (
          <div className="flex flex-col gap-5 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Mostrar barra de progreso</span>
              <Switch checked={value.showProgress} onCheckedChange={(v) => set({ showProgress: v })} aria-label="Mostrar barra de progreso" />
            </div>
            <fieldset disabled={!value.showProgress} className={cn("flex flex-col gap-2", !value.showProgress && "opacity-50")}>
              <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Posición</legend>
              {(
                [
                  ["top", "Parte superior de la página"],
                  ["bottom", "Parte inferior de la página"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="radio" name="progress-position" checked={value.progressPosition === key} onChange={() => set({ progressPosition: key })} />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset disabled={!value.showProgress} className={cn("flex flex-col gap-2", !value.showProgress && "opacity-50")}>
              <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Formato</legend>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showCount} onChange={(e) => setFormat(e.target.checked, showPercent)} />
                Mostrar preguntas completadas (1/10)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showPercent} onChange={(e) => setFormat(showCount, e.target.checked)} />
                Mostrar porcentaje completado
              </label>
            </fieldset>
          </div>
        )}
      </div>
    </aside>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }): ReactNode {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </li>
  );
}

function SoonRow({ label, detail }: { label: string; detail?: string }): ReactNode {
  return (
    <li className="flex items-center justify-between gap-2 px-3 py-3 text-sm text-muted-foreground">
      <span>{label}</span>
      <span className="flex items-center gap-2 text-xs">
        {detail}
        <Badge variant="secondary">Próximamente</Badge>
      </span>
    </li>
  );
}
