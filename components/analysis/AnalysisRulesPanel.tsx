"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Ban, Check, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalysisQuestion, CompletenessFilter } from "@/lib/analysis";
import {
  comparableQuestions,
  compareRuleLabel,
  createCompareRule,
  createCompletenessFilterRule,
  createPeriodFilterRule,
  createQuestionFilterRule,
  createShowRule,
  deleteParameter,
  filterRuleLabel,
  optionLabel,
  optionValuesForQuestion,
  parameterList,
  showRuleLabel,
  toggleParameter,
  type AnalysisRulesState,
  type FilterRule,
} from "@/lib/analysis-rules";

type Mode = "list" | "filter" | "compare" | "show";
type FilterDraftKind = "question_answer" | "completeness" | "period";

export function AnalysisRulesPanel({
  open,
  onOpenChange,
  questions,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: AnalysisQuestion[];
  value: AnalysisRulesState;
  onChange: (next: AnalysisRulesState) => void;
}) {
  const [mode, setMode] = useState<Mode>("list");
  const [filterKind, setFilterKind] = useState<FilterDraftKind>("question_answer");
  const [qaQuestionId, setQaQuestionId] = useState("");
  const [qaValues, setQaValues] = useState<string[]>([]);
  const [completeness, setCompleteness] = useState<Exclude<CompletenessFilter, "all">>("completed");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [compareQuestionId, setCompareQuestionId] = useState("");
  const [compareValues, setCompareValues] = useState<string[]>([]);
  const [showQuestionIds, setShowQuestionIds] = useState<string[]>([]);

  const filterable = useMemo(() => comparableQuestions(questions), [questions]);
  const qaQuestion = filterable.find((q) => q.id === qaQuestionId) ?? filterable[0] ?? null;
  const compareQuestion =
    filterable.find((q) => q.id === compareQuestionId) ?? filterable[0] ?? null;
  const items = parameterList(value);

  if (!open) return null;

  function resetDrafts() {
    setQaQuestionId(filterable[0]?.id ?? "");
    setQaValues([]);
    setCompleteness("completed");
    setDateFrom("");
    setDateTo("");
    setCompareQuestionId(filterable[0]?.id ?? "");
    setCompareValues([]);
    setShowQuestionIds(questions.map((q) => q.id));
  }

  function startMode(next: Mode) {
    resetDrafts();
    setMode(next);
  }

  function applyFilter() {
    let rule: FilterRule | null = null;
    if (filterKind === "question_answer" && qaQuestion && qaValues.length > 0) {
      rule = createQuestionFilterRule(qaQuestion, qaValues);
    } else if (filterKind === "completeness") {
      rule = createCompletenessFilterRule(completeness);
    } else if (filterKind === "period" && (dateFrom || dateTo)) {
      rule = createPeriodFilterRule(dateFrom, dateTo);
    }
    if (!rule) return;
    onChange({ ...value, filters: [rule, ...value.filters] });
    setMode("list");
  }

  function applyCompare() {
    if (!compareQuestion || compareValues.length < 2) return;
    const rule = createCompareRule(compareQuestion, compareValues);
    // New compare starts enabled; other compares turn off (SM one active compare).
    onChange({
      ...value,
      compares: [rule, ...value.compares.map((entry) => ({ ...entry, enabled: false }))],
    });
    setMode("list");
  }

  function applyShow() {
    if (showQuestionIds.length === 0) return;
    const rule = createShowRule(questions, showQuestionIds);
    onChange({
      ...value,
      shows: [rule, ...value.shows.map((entry) => ({ ...entry, enabled: false }))],
    });
    setMode("list");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar parámetros"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => onOpenChange(false)}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">Parámetros</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </Button>
        </div>

        {mode === "list" ? (
          <>
            <div className="flex gap-2 border-b px-4 py-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => startMode("filter")}>
                + Filtrar
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => startMode("compare")}>
                + Comparar
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => startMode("show")}>
                + Mostrar
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Creá filtros y comparaciones; quedan en esta lista para activarlos o
                  desactivarlos. Los activos se combinan en los resultados.
                </p>
              ) : (
                <ul className="divide-y">
                  {items.map((item) => {
                    const kindLabel =
                      item.type === "filter"
                        ? "Filtrar"
                        : item.type === "compare"
                          ? "Comparar"
                          : "Mostrar";
                    const detail =
                      item.type === "filter"
                        ? filterRuleLabel(item.rule, questions)
                        : item.type === "compare"
                          ? compareRuleLabel(item.rule, questions)
                          : showRuleLabel(item.rule, questions);
                    return (
                      <ParameterRow
                        key={`${item.type}-${item.rule.id}`}
                        active={item.rule.enabled}
                        kindLabel={kindLabel}
                        detail={detail}
                        onToggle={() =>
                          onChange(toggleParameter(value, item.type, item.rule.id))
                        }
                        onDelete={() =>
                          onChange(deleteParameter(value, item.type, item.rule.id))
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex gap-2 border-t px-4 py-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  onChange({ filters: [], compares: [], shows: [] })
                }
                disabled={items.length === 0}
              >
                Limpiar todo
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Listo
              </Button>
            </div>
          </>
        ) : null}

        {mode === "filter" ? (
          <RuleComposer
            title="Nuevo filtro"
            onBack={() => setMode("list")}
            onApply={applyFilter}
            applyDisabled={
              (filterKind === "question_answer" && (!qaQuestion || qaValues.length === 0)) ||
              (filterKind === "period" && !dateFrom && !dateTo)
            }
          >
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={filterKind}
                onChange={(event) => setFilterKind(event.target.value as FilterDraftKind)}
              >
                <option value="question_answer">Pregunta y respuesta</option>
                <option value="completeness">Completitud</option>
                <option value="period">Periodo</option>
              </select>
            </div>

            {filterKind === "question_answer" ? (
              <>
                <QuestionPicker
                  questions={filterable}
                  value={qaQuestion?.id ?? ""}
                  onChange={(id) => {
                    setQaQuestionId(id);
                    setQaValues([]);
                  }}
                />
                {qaQuestion ? (
                  <OptionChecklist
                    question={qaQuestion}
                    selected={qaValues}
                    onChange={setQaValues}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No hay preguntas cerradas.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Varias opciones en un filtro = O. Varios filtros activos = Y.
                </p>
              </>
            ) : null}

            {filterKind === "completeness" ? (
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ["completed", "Solo finalizadas"],
                    ["partial", "Solo parciales"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="completeness-draft"
                      checked={completeness === key}
                      onChange={() => setCompleteness(key)}
                      className="accent-foreground"
                    />
                    {label}
                  </label>
                ))}
              </div>
            ) : null}

            {filterKind === "period" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Desde</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Hasta</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            ) : null}
          </RuleComposer>
        ) : null}

        {mode === "compare" ? (
          <RuleComposer
            title="Nueva comparación"
            onBack={() => setMode("list")}
            onApply={applyCompare}
            applyDisabled={!compareQuestion || compareValues.length < 2}
          >
            <p className="text-sm text-muted-foreground">
              Elegí una pregunta y al menos 2 opciones. Queda guardada en la lista para
              activarla o desactivarla cuando quieras.
            </p>
            <QuestionPicker
              questions={filterable}
              value={compareQuestion?.id ?? ""}
              onChange={(id) => {
                setCompareQuestionId(id);
                setCompareValues([]);
              }}
            />
            {compareQuestion ? (
              <OptionChecklist
                question={compareQuestion}
                selected={compareValues}
                onChange={setCompareValues}
                minHint={2}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No hay preguntas cerradas.</p>
            )}
          </RuleComposer>
        ) : null}

        {mode === "show" ? (
          <RuleComposer
            title="Nueva regla Mostrar"
            onBack={() => setMode("list")}
            onApply={applyShow}
            applyDisabled={showQuestionIds.length === 0}
          >
            <p className="text-sm text-muted-foreground">
              Marcá las preguntas visibles. También queda en la lista para activar/desactivar.
            </p>
            <div className="flex flex-col gap-1.5">
              {questions.map((question) => {
                const checked = showQuestionIds.includes(question.id);
                return (
                  <label
                    key={question.id}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-foreground"
                      checked={checked}
                      onChange={() =>
                        setShowQuestionIds((current) =>
                          checked
                            ? current.filter((id) => id !== question.id)
                            : [...current, question.id],
                        )
                      }
                    />
                    <span>
                      P{question.index}. {question.title}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQuestionIds(questions.map((q) => q.id))}
              >
                Todas
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowQuestionIds([])}>
                Ninguna
              </Button>
            </div>
          </RuleComposer>
        ) : null}
      </aside>
    </>
  );
}

function ParameterRow({
  active,
  kindLabel,
  detail,
  onToggle,
  onDelete,
}: {
  active: boolean;
  kindLabel: string;
  detail: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <li className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
          active
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-muted-foreground/50 text-muted-foreground",
        )}
        aria-label={active ? "Desactivar" : "Activar"}
        title={active ? "Activo — clic para desactivar" : "Inactivo — clic para activar"}
      >
        {active ? <Check className="size-3.5 stroke-[3]" /> : <Ban className="size-3.5" />}
      </button>
      <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left text-sm">
        <span className="font-semibold">{kindLabel}: </span>
        <span className="text-foreground/90">{detail}</span>
      </button>
      <div className="relative shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Más opciones"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal className="size-4" />
        </Button>
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10"
              aria-label="Cerrar menú"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1 min-w-36 rounded-md border bg-background py-1 shadow-md">
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setMenuOpen(false);
                  onToggle();
                }}
              >
                {active ? "Desactivar" : "Activar"}
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-muted"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                Eliminar
              </button>
            </div>
          </>
        ) : null}
      </div>
    </li>
  );
}

function RuleComposer({
  title,
  onBack,
  onApply,
  applyDisabled,
  children,
}: {
  title: string;
  onBack: () => void;
  onApply: () => void;
  applyDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <div className="border-b px-4 py-3">
        <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={onBack}>
          ← Volver a parámetros
        </button>
        <h3 className="mt-1 font-semibold">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">{children}</div>
      </div>
      <div className="flex gap-2 border-t px-4 py-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={onApply} disabled={applyDisabled}>
          Aplicar
        </Button>
      </div>
    </>
  );
}

function QuestionPicker({
  questions,
  value,
  onChange,
}: {
  questions: AnalysisQuestion[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Pregunta</Label>
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {questions.map((question) => (
          <option key={question.id} value={question.id}>
            P{question.index}. {question.title}
          </option>
        ))}
      </select>
    </div>
  );
}

function OptionChecklist({
  question,
  selected,
  onChange,
  minHint,
}: {
  question: AnalysisQuestion;
  selected: string[];
  onChange: (next: string[]) => void;
  minHint?: number;
}) {
  const values = optionValuesForQuestion(question);
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Opciones{minHint ? ` (mín. ${minHint})` : ""}</Label>
      <div className="rounded-md border p-2">
        {values.map((value) => {
          const checked = selected.includes(value);
          return (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/60"
            >
              <input
                type="checkbox"
                className="accent-foreground"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked ? selected.filter((v) => v !== value) : [...selected, value],
                  )
                }
              />
              {optionLabel(question, value)}
            </label>
          );
        })}
      </div>
    </div>
  );
}
