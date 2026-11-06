"use client";

import { useMemo, useState } from "react";
import { Columns2, Download, Filter, GitBranch, ListTree, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisComparePanel } from "@/components/analysis/AnalysisComparePanel";
import { AnalysisFilterPanel } from "@/components/analysis/AnalysisFilterPanel";
import { AnalysisViewsBar } from "@/components/analysis/AnalysisViewsBar";
import { CompareResults } from "@/components/analysis/CompareResults";
import { IndividualResponses } from "@/components/analysis/IndividualResponses";
import { QuestionResultCard } from "@/components/analysis/QuestionResultCard";
import { ResponseFlowChart } from "@/components/analysis/ResponseFlowChart";
import { buildResponsesCsv, downloadCsv } from "@/lib/export-csv";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  filterChipLabels,
  filterResponses,
  type AnalysisFilterState,
  type AnalysisPayload,
} from "@/lib/analysis";
import {
  createCompareGroup,
  type AnalysisView,
  type CompareGroup,
} from "@/lib/analysis-views";

export function SurveyResultsAnalysis({
  surveyId,
  data,
  initialViews,
}: {
  surveyId: string;
  data: AnalysisPayload;
  initialViews: AnalysisView[];
}) {
  const [filters, setFilters] = useState<AnalysisFilterState>(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareGroups, setCompareGroups] = useState<CompareGroup[]>(() => [
    createCompareGroup("Grupo A"),
    createCompareGroup("Grupo B"),
  ]);
  const [compareActive, setCompareActive] = useState(false);
  const [views, setViews] = useState<AnalysisView[]>(initialViews);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [tab, setTab] = useState("summary");

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
    setActiveViewId(null);
  }

  function removeChip(chip: string) {
    setActiveViewId(null);
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

  function exportCsv() {
    const csv = buildResponsesCsv(data.questions, filteredResponses);
    const slug = data.surveyTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    downloadCsv(`${slug || "encuesta"}-respuestas.csv`, csv);
  }

  function applyView(view: AnalysisView) {
    setFilters(structuredClone(view.filters));
    const groups =
      view.compareGroups.length >= 2
        ? structuredClone(view.compareGroups)
        : [createCompareGroup("Grupo A"), createCompareGroup("Grupo B")];
    setCompareGroups(groups);
    setCompareActive(view.compareGroups.length >= 2);
    setActiveViewId(view.id);
    if (view.compareGroups.length >= 2) setTab("compare");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Análisis</h2>
          <p className="text-sm text-muted-foreground">{data.surveyTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={exportCsv}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
          <Button
            variant={compareActive ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => setCompareOpen(true)}
          >
            <Columns2 className="size-4" />
            Comparar
          </Button>
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
      </div>

      <AnalysisViewsBar
        surveyId={surveyId}
        views={views}
        filters={filters}
        compareGroups={compareActive ? compareGroups : []}
        activeViewId={activeViewId}
        onViewsChange={setViews}
        onApplyView={applyView}
      />

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

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList variant="line">
          <TabsTrigger value="summary" className="gap-1.5 px-3">
            <ListTree className="size-3.5" />
            Resumen por pregunta
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-1.5 px-3">
            <Users className="size-3.5" />
            Respuestas individuales
          </TabsTrigger>
          <TabsTrigger value="flow" className="gap-1.5 px-3">
            <GitBranch className="size-3.5" />
            Flujo
          </TabsTrigger>
          {compareActive ? (
            <TabsTrigger value="compare" className="gap-1.5 px-3">
              <Columns2 className="size-3.5" />
              Comparar
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="summary" className="mt-4">
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
        </TabsContent>

        <TabsContent value="individual" className="mt-4">
          <IndividualResponses questions={data.questions} responses={filteredResponses} />
        </TabsContent>

        <TabsContent value="flow" className="mt-4">
          <ResponseFlowChart
            questions={data.questions}
            edges={data.edges}
            responses={filteredResponses}
          />
        </TabsContent>

        {compareActive ? (
          <TabsContent value="compare" className="mt-4">
            <CompareResults
              questions={data.questions}
              responses={data.responses}
              groups={compareGroups}
            />
          </TabsContent>
        ) : null}
      </Tabs>

      <AnalysisFilterPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        questions={data.questions}
        value={filters}
        onChange={(next) => {
          setActiveViewId(null);
          setFilters(next);
        }}
        onCompare={() => setCompareOpen(true)}
      />

      <AnalysisComparePanel
        open={compareOpen}
        onOpenChange={(open) => {
          setCompareOpen(open);
          if (!open) {
            setCompareActive(true);
            setTab("compare");
            setActiveViewId(null);
          }
        }}
        questions={data.questions}
        value={compareGroups}
        onChange={(next) => {
          setActiveViewId(null);
          setCompareGroups(next);
        }}
      />
    </div>
  );
}
