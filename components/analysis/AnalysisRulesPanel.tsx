"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Columns2, Eye, Filter, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AnalysisQuestion, CompletenessFilter } from "@/lib/analysis";
import {
  comparableQuestions,
  createCompareRule,
  createCompletenessFilterRule,
  createPeriodFilterRule,
  createQuestionFilterRule,
  createShowRule,
  optionLabel,
  optionValuesForQuestion,
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
    onChange({ ...value, filters: [...value.filters, rule] });
    setMode("list");
  }

  function applyCompare() {
    if (!compareQuestion || compareValues.length < 2) return;
    const rule = createCompareRule(compareQuestion, compareValues);
    onChange({ ...value, compare: rule });
    setMode("list");
  }

  function applyShow() {
    if (showQuestionIds.length === 0) return;
    const rule = createShowRule(questions, showQuestionIds);
    onChange({ ...value, show: rule });
    setMode("list");
  }

  function toggleFilter(id: string) {
    onChange({
      ...value,
      filters: value.filters.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    });
  }

  function deleteFilter(id: string) {
    onChange({ ...value, filters: value.filters.filter((rule) => rule.id !== id) });
  }

  function toggleCompare() {
    if (!value.compare) return;
    onChange({ ...value, compare: { ...value.compare, enabled: !value.compare.enabled } });
  }

  function deleteCompare() {
    onChange({ ...value, compare: null });
  }

  function toggleShow() {
    if (!value.show) return;
    onChange({ ...value, show: { ...value.show, enabled: !value.show.enabled } });
  }

  function deleteShow() {
    onChange({ ...value, show: null });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar reglas"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => onOpenChange(false)}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4" />
            <h2 className="font-semibold">Reglas</h2>
          </div>
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
              <Button size="sm" className="flex-1 gap-1" onClick={() => startMode("filter")}>
                <Filter className="size-3.5" />
                + Filtrar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => startMode("compare")}
              >
                <Columns2 className="size-3.5" />
                + Comparar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => startMode("show")}
              >
                <Eye className="size-3.5" />
                + Mostrar
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Como en SurveyMonkey: Filtrar reduce respuestas, Comparar cruza opciones de una
                pregunta, Mostrar oculta el resto de preguntas.
              </p>

              {value.filters.length === 0 && !value.compare && !value.show ? (
                <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
                  Todavía no hay reglas. Usá + Filtrar, + Comparar o + Mostrar.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {value.filters.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      active={rule.enabled}
                      label={rule.name}
                      kind="Filtro"
                      onToggle={() => toggleFilter(rule.id)}
                      onDelete={() => deleteFilter(rule.id)}
                    />
                  ))}
                  {value.compare ? (
                    <RuleRow
                      active={value.compare.enabled}
                      label={value.compare.name}
                      kind="Comparar"
                      onToggle={toggleCompare}
                      onDelete={deleteCompare}
                    />
                  ) : null}
                  {value.show ? (
                    <RuleRow
                      active={value.show.enabled}
                      label={value.show.name}
                      kind="Mostrar"
                      onToggle={toggleShow}
                      onDelete={deleteShow}
                    />
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t px-4 py-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  onChange({ filters: [], compare: null, show: null })
                }
              >
                Limpiar reglas
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Listo
              </Button>
            </div>
          </>
        ) : null}

        {mode === "filter" ? (
          <RuleComposer
            title="Nueva regla de filtro"
            onBack={() => setMode("list")}
            onApply={applyFilter}
            applyDisabled={
              (filterKind === "question_answer" && (!qaQuestion || qaValues.length === 0)) ||
              (filterKind === "period" && !dateFrom && !dateTo)
            }
          >
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de filtro</Label>
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
                  Dentro de un filtro, las opciones se combinan con O. Varios filtros se combinan
                  con Y.
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
            title="Nueva regla de comparación"
            onBack={() => setMode("list")}
            onApply={applyCompare}
            applyDisabled={!compareQuestion || compareValues.length < 2}
          >
            <p className="text-sm text-muted-foreground">
              Elegí una pregunta y al menos 2 opciones para ver el resto de resultados lado a lado
              (como SurveyMonkey Compare).
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
            {value.compare ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Al aplicar se reemplaza la comparación actual.
              </p>
            ) : null}
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
              Marcá las preguntas que querés ver. El resto se oculta del resumen.
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
            {value.show ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Solo puede haber una regla Mostrar; al aplicar se reemplaza la actual.
              </p>
            ) : null}
          </RuleComposer>
        ) : null}
      </aside>
    </>
  );
}

function RuleRow({
  active,
  label,
  kind,
  onToggle,
  onDelete,
}: {
  active: boolean;
  label: string;
  kind: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2",
        active ? "border-foreground/30 bg-muted/30" : "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border"
        aria-label={active ? "Desactivar regla" : "Activar regla"}
        title="Activar / desactivar"
      >
        {active ? <Check className="size-3" /> : null}
      </button>
      <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {kind}
        </p>
        <p className="text-sm font-medium">{label}</p>
      </button>
      <div className="relative">
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
            <div className="absolute right-0 z-20 mt-1 min-w-32 rounded-md border bg-background py-1 shadow-md">
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
    </div>
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
          ← Volver a reglas
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
