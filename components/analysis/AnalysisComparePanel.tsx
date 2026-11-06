"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Columns2, Plus, Trash2, X } from "lucide-react";
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
import { createCompareGroup, type CompareGroup } from "@/lib/analysis-views";

export function AnalysisComparePanel({
  open,
  onOpenChange,
  questions,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: AnalysisQuestion[];
  value: CompareGroup[];
  onChange: (next: CompareGroup[]) => void;
}) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(value[0]?.id ?? null);
  const filterableQuestions = useMemo(
    () => questions.filter((q) => isChoiceType(q.type) || isAverageType(q.type)),
    [questions],
  );

  if (!open) return null;

  function updateGroup(id: string, patch: Partial<CompareGroup>) {
    onChange(value.map((group) => (group.id === id ? { ...group, ...patch } : group)));
  }

  function updateFilters(id: string, filters: AnalysisFilterState) {
    updateGroup(id, { filters });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar comparar"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={() => onOpenChange(false)}
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Columns2 className="size-4" />
            <h2 className="font-semibold">Comparar</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Cerrar">
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Creá grupos con distintos filtros (como en SurveyMonkey) para ver resultados lado a lado.
          </p>

          <div className="flex flex-col gap-3">
            {value.map((group, index) => {
              const openGroup = expandedGroupId === group.id;
              return (
                <div key={group.id} className="rounded-lg border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/40"
                    onClick={() => setExpandedGroupId(openGroup ? null : group.id)}
                  >
                    <span>
                      Grupo {index + 1}: {group.name}
                    </span>
                    <ChevronDown className={cn("size-4 transition-transform", openGroup && "rotate-180")} />
                  </button>
                  {openGroup ? (
                    <div className="flex flex-col gap-3 border-t px-3 py-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Nombre</Label>
                        <Input
                          value={group.name}
                          onChange={(event) => updateGroup(group.id, { name: event.target.value })}
                        />
                      </div>
                      <GroupFiltersEditor
                        questions={filterableQuestions}
                        value={group.filters}
                        onChange={(filters) => updateFilters(group.id, filters)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-destructive"
                        disabled={value.length <= 2}
                        onClick={() => {
                          const next = value.filter((entry) => entry.id !== group.id);
                          onChange(next);
                          setExpandedGroupId(next[0]?.id ?? null);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Quitar grupo
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full gap-1.5"
            disabled={value.length >= 6}
            onClick={() => {
              const group = createCompareGroup(`Grupo ${value.length + 1}`);
              onChange([...value, group]);
              setExpandedGroupId(group.id);
            }}
          >
            <Plus className="size-4" />
            Agregar grupo
          </Button>
        </div>

        <div className="flex gap-2 border-t px-4 py-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onChange([
                createCompareGroup("Grupo A"),
                createCompareGroup("Grupo B"),
              ]);
            }}
          >
            Restablecer
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Aplicar
          </Button>
        </div>
      </aside>
    </>
  );
}

function GroupFiltersEditor({
  questions,
  value,
  onChange,
}: {
  questions: AnalysisQuestion[];
  value: AnalysisFilterState;
  onChange: (next: AnalysisFilterState) => void;
}) {
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
        nextValues.length === 0 ? other : [...other, { questionId, values: nextValues }],
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Completitud</Label>
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={value.completeness}
          onChange={(event) => setCompleteness(event.target.value as CompletenessFilter)}
        >
          <option value="all">Todas</option>
          <option value="completed">Finalizadas</option>
          <option value="partial">Parciales</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label>Desde</Label>
          <Input
            type="date"
            value={value.dateFrom}
            onChange={(event) => onChange({ ...value, dateFrom: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={value.dateTo}
            onChange={(event) => onChange({ ...value, dateTo: event.target.value })}
          />
        </div>
      </div>
      {questions.map((question) => {
        const selected =
          value.questionFilters.find((f) => f.questionId === question.id)?.values ?? [];
        const optionValues = isAverageType(question.type)
          ? Array.from({ length: RATING_MAX }, (_, i) => String(i + 1))
          : question.options.map((option) => option.value);
        return (
          <div key={question.id} className="rounded-md border p-2">
            <p className="mb-1 text-xs font-medium">
              P{question.index}. {question.title}
            </p>
            <div className="flex flex-col gap-1">
              {optionValues.map((optionValue) => {
                const label = isAverageType(question.type)
                  ? `${optionValue}★`
                  : (question.options.find((o) => o.value === optionValue)?.label ?? optionValue);
                return (
                  <label key={optionValue} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selected.includes(optionValue)}
                      onChange={() => toggleQuestionValue(question.id, optionValue)}
                      className="accent-foreground"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
      {questions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin preguntas filtrables.</p>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange(EMPTY_FILTERS)}
      >
        Limpiar filtros del grupo
      </Button>
    </div>
  );
}
