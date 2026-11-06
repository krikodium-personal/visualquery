"use client";

import { useMemo, useState } from "react";
import { Download, Filter, GitBranch, ListTree, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisRulesPanel } from "@/components/analysis/AnalysisRulesPanel";
import { AnalysisViewsBar } from "@/components/analysis/AnalysisViewsBar";
import { CompareResults } from "@/components/analysis/CompareResults";
import { IndividualResponses } from "@/components/analysis/IndividualResponses";
import { QuestionResultCard } from "@/components/analysis/QuestionResultCard";
import { ResponseFlowChart } from "@/components/analysis/ResponseFlowChart";
import { buildResponsesCsv, downloadCsv } from "@/lib/export-csv";
import type { AnalysisPayload } from "@/lib/analysis";
import {
  activeRuleChips,
  applyFilterRules,
  countActiveRules,
  EMPTY_RULES,
  visibleQuestions,
  type AnalysisRulesState,
} from "@/lib/analysis-rules";
import type { AnalysisView } from "@/lib/analysis-views";

export function SurveyResultsAnalysis({
  surveyId,
  data,
  initialViews,
}: {
  surveyId: string;
  data: AnalysisPayload;
  initialViews: AnalysisView[];
}) {
  const [rules, setRules] = useState<AnalysisRulesState>(() => structuredClone(EMPTY_RULES));
  const [panelOpen, setPanelOpen] = useState(false);
  const [views, setViews] = useState<AnalysisView[]>(initialViews);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [tab, setTab] = useState("summary");

  const filteredResponses = useMemo(
    () => applyFilterRules(data.responses, rules.filters),
    [data.responses, rules.filters],
  );

  const questionsShown = useMemo(
    () => visibleQuestions(data.questions, rules.show),
    [data.questions, rules.show],
  );

  const activeCount = countActiveRules(rules);
  const chips = activeRuleChips(rules);
  const totalResponses = data.responses.length;
  const filteredCount = filteredResponses.length;
  const completedResponses = filteredResponses.filter((r) => r.completedAt).length;
  const completionRate =
    filteredCount === 0 ? 0 : Math.round((completedResponses / filteredCount) * 100);
  const compareOn = Boolean(rules.compare?.enabled && rules.compare.values.length >= 2);

  function clearRules() {
    setRules(structuredClone(EMPTY_RULES));
    setActiveViewId(null);
    if (tab === "compare") setTab("summary");
  }

  function removeChip(id: string, kind: "filter" | "compare" | "show") {
    setActiveViewId(null);
    setRules((current) => {
      if (kind === "filter") {
        return { ...current, filters: current.filters.filter((rule) => rule.id !== id) };
      }
      if (kind === "compare") return { ...current, compare: null };
      return { ...current, show: null };
    });
    if (kind === "compare" && tab === "compare") setTab("summary");
  }

  function exportCsv() {
    const csv = buildResponsesCsv(questionsShown, filteredResponses);
    const slug = data.surveyTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    downloadCsv(`${slug || "encuesta"}-respuestas.csv`, csv);
  }

  function applyView(view: AnalysisView) {
    setRules(structuredClone(view.rules));
    setActiveViewId(view.id);
    if (view.rules.compare?.enabled) setTab("compare");
    else if (tab === "compare") setTab("summary");
  }

  function updateRules(next: AnalysisRulesState) {
    setActiveViewId(null);
    setRules(next);
    if (next.compare?.enabled && next.compare.values.length >= 2) {
      setTab("compare");
    } else if (tab === "compare") {
      setTab("summary");
    }
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
            variant={activeCount > 0 ? "default" : "outline"}
            onClick={() => setPanelOpen(true)}
            className="gap-1.5"
          >
            <Filter className="size-4" />
            Reglas
            {activeCount > 0 ? (
              <Badge variant="secondary" className="ml-0.5 bg-background/20 text-current">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </div>
      </div>

      <AnalysisViewsBar
        surveyId={surveyId}
        views={views}
        rules={rules}
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

      {activeCount > 0 ? (
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Reglas activas · {filteredCount} de {totalResponses} encuestados
            {rules.show?.enabled
              ? ` · ${questionsShown.length} de ${data.questions.length} preguntas`
              : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => removeChip(chip.id, chip.kind)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-muted"
                title="Quitar regla"
              >
                <span className="truncate">{chip.label}</span>
                <X className="size-3 shrink-0 opacity-60" />
              </button>
            ))}
            <Button variant="ghost" size="xs" onClick={clearRules}>
              Limpiar reglas
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
          {compareOn ? (
            <TabsTrigger value="compare" className="gap-1.5 px-3">
              Comparar
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          {questionsShown.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {data.questions.length === 0
                  ? "Esta encuesta todavía no tiene preguntas."
                  : "La regla Mostrar no deja ninguna pregunta visible."}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {questionsShown.map((question) => (
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
          <IndividualResponses questions={questionsShown} responses={filteredResponses} />
        </TabsContent>

        <TabsContent value="flow" className="mt-4">
          <ResponseFlowChart
            questions={questionsShown}
            edges={data.edges}
            responses={filteredResponses}
          />
        </TabsContent>

        {compareOn && rules.compare ? (
          <TabsContent value="compare" className="mt-4">
            <CompareResults
              questions={questionsShown}
              responses={filteredResponses}
              compare={rules.compare}
            />
          </TabsContent>
        ) : null}
      </Tabs>

      <AnalysisRulesPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        questions={data.questions}
        value={rules}
        onChange={updateRules}
      />
    </div>
  );
}
