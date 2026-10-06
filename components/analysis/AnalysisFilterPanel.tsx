"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  isAverageType,
  isChoiceType,
  RATING_MAX,
  type AnalysisFilterState,
  type AnalysisQuestion,
  type CompletenessFilter,
} from "@/lib/analysis";

type SectionKey = "question" | "completeness" | "period";

export function AnalysisFilterPanel({
  open,
  onOpenChange,
  questions,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: AnalysisQuestion[];
  value: AnalysisFilterState;
  onChange: (next: AnalysisFilterState) => void;
}) {
  const [section, setSection] = useState<SectionKey | null>("question");
  const filterableQuestions = useMemo(
    () => questions.filter((q) => isChoiceType(q.type) || isAverageType(q.type)),
    [questions],
  );

  if (!open) return null;

  function toggleSection(key: SectionKey) {
    setSection((current) => (current === key ? null : key));
  }

  function setCompleteness(completeness: CompletenessFilter) {
    onChange({ ...value, completeness });
  }

  function toggleQuestionValue(questionId: string, optionValue: string) {
    const existing = value.questionFilters.find((f) => f.questionId === questionId);
    const currentValues = existing?.values ?? [];
    const nextValues = currentValues.includes(optionValue)
      ? currentValues.filter((v) => v !== optionValue)
      : [...currentValues, optionValue];

    const other = value.questionFilters.filter((f) => f.questionId !== questionId);
    onChange({
      ...value,
      questionFilters:
        nextValues.length === 0
          ? other
          : [...other, { questionId, values: nextValues }],
    });
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
          <div className="flex items-center gap-2">
            <Filter className="size-4" />
            <h2 className="font-semibold">Parámetros</h2>
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

        <div className="flex gap-2 border-b px-4 py-3">
          <Button size="sm" className="flex-1">
            + Filtrar
          </Button>
          <Button size="sm" variant="outline" className="flex-1" disabled title="Próximamente">
            + Comparar
          </Button>
          <Button size="sm" variant="outline" className="flex-1" disabled title="Próximamente">
            + Mostrar
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FilterSection
            title="Filtrar por pregunta y respuestas"
            open={section === "question"}
            onToggle={() => toggleSection("question")}
          >
            {filterableQuestions.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-muted-foreground">
                No hay preguntas filtrables todavía.
              </p>
            ) : (
              <div className="flex flex-col gap-4 px-4 pb-4">
                {filterableQuestions.map((question) => {
                  const selected =
                    value.questionFilters.find((f) => f.questionId === question.id)?.values ??
                    [];
                  const optionValues = isAverageType(question.type)
                    ? Array.from({ length: RATING_MAX }, (_, i) => String(i + 1))
                    : question.options.map((option) => option.value);

                  return (
                    <div key={question.id} className="rounded-lg border p-3">
                      <p className="mb-2 text-sm font-medium">
                        P{question.index}. {question.title}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {optionValues.map((optionValue) => {
                          const label = isAverageType(question.type)
                            ? `${optionValue} estrella${optionValue === "1" ? "" : "s"}`
                            : (question.options.find((o) => o.value === optionValue)?.label ??
                              optionValue);
                          const checked = selected.includes(optionValue);
                          return (
                            <label
                              key={optionValue}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/60"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleQuestionValue(question.id, optionValue)}
                                className="size-3.5 accent-foreground"
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </FilterSection>

          <FilterSection
            title="Filtrar por nivel de completitud"
            open={section === "completeness"}
            onToggle={() => toggleSection("completeness")}
          >
            <div className="flex flex-col gap-1.5 px-4 pb-4">
              {(
                [
                  ["all", "Todas las respuestas"],
                  ["completed", "Solo finalizadas"],
                  ["partial", "Solo parciales"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted/60"
                >
                  <input
                    type="radio"
                    name="completeness"
                    checked={value.completeness === key}
                    onChange={() => setCompleteness(key)}
                    className="accent-foreground"
                  />
                  {label}
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection
            title="Filtrar por periodo"
            open={section === "period"}
            onToggle={() => toggleSection("period")}
          >
            <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-from">Desde</Label>
                <Input
                  id="filter-from"
                  type="date"
                  value={value.dateFrom}
                  onChange={(event) =>
                    onChange({ ...value, dateFrom: event.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-to">Hasta</Label>
                <Input
                  id="filter-to"
                  type="date"
                  value={value.dateTo}
                  onChange={(event) =>
                    onChange({ ...value, dateTo: event.target.value })
                  }
                />
              </div>
            </div>
          </FilterSection>

          <div className="border-t px-4 py-3 text-sm text-muted-foreground">
            Próximamente: recopilador, metadatos, variables personalizadas y A/B.
          </div>
        </div>

        <div className="flex gap-2 border-t px-4 py-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Limpiar
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Aplicar
          </Button>
        </div>
      </aside>
    </>
  );
}

function FilterSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/40"
      >
        {title}
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? children : null}
    </div>
  );
}
