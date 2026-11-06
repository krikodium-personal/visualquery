"use client";

import { useState, useTransition } from "react";
import { Bookmark, Check, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnalysisFilterState } from "@/lib/analysis";
import {
  createAnalysisView,
  type AnalysisView,
  type CompareGroup,
} from "@/lib/analysis-views";
import { saveAnalysisViews } from "@/actions/analysis-views";

export function AnalysisViewsBar({
  surveyId,
  views,
  filters,
  compareGroups,
  activeViewId,
  onViewsChange,
  onApplyView,
}: {
  surveyId: string;
  views: AnalysisView[];
  filters: AnalysisFilterState;
  compareGroups: CompareGroup[];
  activeViewId: string | null;
  onViewsChange: (views: AnalysisView[]) => void;
  onApplyView: (view: AnalysisView) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  function persist(next: AnalysisView[]) {
    onViewsChange(next);
    startTransition(async () => {
      try {
        await saveAnalysisViews(surveyId, next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron guardar las vistas");
      }
    });
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Escribí un nombre para la vista");
      return;
    }
    setSaving(true);
    const view = createAnalysisView(trimmed, filters, compareGroups);
    persist([view, ...views]);
    setName("");
    setSaving(false);
    toast.success("Vista guardada");
  }

  function handleDelete(id: string) {
    persist(views.filter((view) => view.id !== id));
    toast.success("Vista eliminada");
  }

  return (
    <div className="rounded-xl border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Bookmark className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Vistas guardadas</span>
        {isPending ? (
          <span className="text-xs text-muted-foreground">Guardando…</span>
        ) : null}
      </div>

      {views.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {views.map((view) => {
            const active = activeViewId === view.id;
            return (
              <div
                key={view.id}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                  active ? "border-foreground bg-background" : "bg-background"
                }`}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => onApplyView(view)}
                >
                  {active ? <Check className="size-3" /> : null}
                  {view.name}
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar vista ${view.name}`}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  onClick={() => handleDelete(view.id)}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Guardá filtros y grupos de comparación para reutilizarlos.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre de la vista"
          className="h-8 max-w-xs text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSave();
          }}
        />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSave} disabled={saving}>
          <Save className="size-3.5" />
          Guardar vista actual
        </Button>
      </div>
    </div>
  );
}
