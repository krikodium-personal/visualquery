"use client";

import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisFilterPanel } from "@/components/analysis/AnalysisFilterPanel";
import { QuestionResultCard } from "@/components/analysis/QuestionResultCard";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  filterChipLabels,
  filterResponses,
  type AnalysisFilterState,
  type AnalysisPayload,
} from "@/lib/analysis";

export function SurveyResultsAnalysis({ data }: { data: AnalysisPayload }) {
  const [filters, setFilters] = useState<AnalysisFilterState>(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);

  const filteredResponses = useMemo(
    () => filterResponses(data.responses, filters),
    [data.responses, filters],
  );

  const activeFilterCount = countActiveFilters(filters);
  const chips = filterChipLabels(filters, data.questions);
  const totalResponses = data.responses.length;
  const filteredCount = filteredResponses.length;
  const completedResponses = filteredResponses.filter((r) => r.completedAt).length;
  const completionRate =
    filteredCount === 0 ? 0 : Math.round((completedResponses / filteredCount) * 100);

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function removeChip(chip: string) {
    // Best-effort clear of the matching filter dimension.
    if (chip.startsWith("Completitud:")) {
      setFilters((current) => ({ ...current, completeness: "all" }));
      return;
    }
    if (chip.startsWith("Periodo:")) {
      setFilters((current) => ({ ...current, dateFrom: "", dateTo: "" }));
      return;
    }
    if (chip.startsWith("P")) {
      const index = Number(chip.slice(1).split(":")[0]);
      const question = data.questions.find((q) => q.index === index);
      if (!question) return;
      setFilters((current) => ({
        ...current,
        questionFilters: current.questionFilters.filter((f) => f.questionId !== question.id),
      }));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Resumen por pregunta</h2>
          <p className="text-sm text-muted-foreground">{data.surveyTitle}</p>
        </div>
        <Button
          variant={activeFilterCount > 0 ? "default" : "outline"}
          onClick={() => setPanelOpen(true)}
          className="gap-1.5"
        >
          <Filter className="size-4" />
          Parámetros
          {activeFilterCount > 0 ? (
            <Badge variant="secondary" className="ml-0.5 bg-background/20 text-current">
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Respuestas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{filteredCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{completedResponses}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de finalización
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{completionRate}%</CardContent>
        </Card>
      </div>

      {activeFilterCount > 0 ? (
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Filtrados: {filteredCount} de {totalResponses} encuestados
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => removeChip(chip)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                title="Quitar filtro"
              >
                <span className="truncate">Filtrar: {chip}</span>
                <X className="size-3 shrink-0 opacity-60" />
              </button>
            ))}
            <Button variant="ghost" size="xs" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      ) : null}

      {data.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Esta encuesta todavía no tiene preguntas.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {data.questions.map((question) => (
            <QuestionResultCard
              key={question.id}
              question={question}
              responses={filteredResponses}
            />
          ))}
        </div>
      )}

      <AnalysisFilterPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        questions={data.questions}
        value={filters}
        onChange={setFilters}
      />
    </div>
  );
}
