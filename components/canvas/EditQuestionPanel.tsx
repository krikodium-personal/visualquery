"use client";

import { useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuestionTypeIcon } from "@/components/questions/QuestionTypeIcon";
import {
  BRANCHABLE_TYPES,
  OPTION_BASED_TYPES,
  QUESTION_TYPE_GROUPS,
  QUESTION_TYPE_LABELS,
  SCORABLE_TYPES,
  type QuestionType,
} from "@/lib/question-types";
import { questionMaxPoints, pointsLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { QuestionOption } from "./QuestionNode";

export type { QuestionType };

export type QuestionFormValues = {
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  required: boolean;
  scoringEnabled: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
};

type SelectionRule = "any" | "exactly" | "at_least" | "at_most";

function selectionRuleFor(values: QuestionFormValues | undefined): SelectionRule {
  if (!values) return "any";
  if (values.minSelections != null && values.minSelections === values.maxSelections) {
    return "exactly";
  }
  if (values.minSelections != null) return "at_least";
  if (values.maxSelections != null) return "at_most";
  return "any";
}

function makeOption(index: number, label: string, kind?: QuestionOption["kind"]): QuestionOption {
  return { value: `opcion-${index + 1}-${crypto.randomUUID().slice(0, 6)}`, label, kind };
}

function defaultOptions(type: QuestionType): QuestionOption[] {
  if (type === "slider") {
    return [
      { value: "scale-left", label: "0", kind: "scale_left" },
      { value: "scale-center", label: "", kind: "scale_center" },
      { value: "scale-right", label: "100", kind: "scale_right" },
    ];
  }
  if (type === "dropdown_matrix") {
    return [
      makeOption(0, "Fila 1", "row"),
      makeOption(1, "Fila 2", "row"),
      makeOption(2, "Opción 1", "choice"),
      makeOption(3, "Opción 2", "choice"),
      makeOption(4, "Opción 3", "choice"),
    ];
  }
  if (type === "rating_matrix") return [makeOption(0, "Aspecto 1"), makeOption(1, "Aspecto 2")];
  if (type === "multiple_text") return [makeOption(0, "Campo 1"), makeOption(1, "Campo 2")];
  if (OPTION_BASED_TYPES.includes(type)) return [makeOption(0, "Opción 1"), makeOption(1, "Opción 2")];
  return [];
}

function optionsForEdit(type: QuestionType, stored: QuestionOption[] | undefined): QuestionOption[] {
  if (type !== "slider") return stored?.length ? stored : defaultOptions(type);
  const defaults = defaultOptions(type);
  return defaults.map((fallback) => stored?.find((option) => option.kind === fallback.kind) ?? fallback);
}

function optionHeading(type: QuestionType): string {
  if (type === "multiple_text") return "Campos";
  if (type === "rating_matrix") return "Filas a valorar";
  if (type === "ranking" || type === "best_worst") return "Elementos";
  return BRANCHABLE_TYPES.includes(type)
    ? "Opciones (cada una puede llevar a una pregunta distinta)"
    : "Opciones";
}

function stripScoring(options: QuestionOption[]): QuestionOption[] {
  return options.map(({ isCorrect: _isCorrect, points: _points, ...rest }) => rest);
}

export function EditQuestionPanel({ open, onOpenChange, initialValues, code, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: QuestionFormValues;
  code?: string;
  onSubmit: (values: QuestionFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<QuestionType>("single_choice");
  const [options, setOptions] = useState<QuestionOption[]>([]);
  const [required, setRequired] = useState(true);
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [selectionRule, setSelectionRule] = useState<SelectionRule>("any");
  const [selectionCount, setSelectionCount] = useState(1);
  const [selectionErrorMessage, setSelectionErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const nextType = initialValues?.type ?? "single_choice";
      setTitle(initialValues?.title ?? "");
      setType(nextType);
      setOptions(optionsForEdit(nextType, initialValues?.options));
      setRequired(initialValues?.required ?? true);
      setScoringEnabled(
        Boolean(initialValues?.scoringEnabled) && SCORABLE_TYPES.includes(nextType),
      );
      const nextRule = selectionRuleFor(initialValues);
      setSelectionRule(nextRule);
      setSelectionCount(initialValues?.minSelections ?? initialValues?.maxSelections ?? 1);
      setSelectionErrorMessage(initialValues?.selectionErrorMessage ?? "");
    }
  }

  const chooseType = (nextType: QuestionType) => {
    if (nextType === type) return;
    setType(nextType);
    setOptions(defaultOptions(nextType));
    if (!SCORABLE_TYPES.includes(nextType)) setScoringEnabled(false);
    if (nextType !== "multi_choice") {
      setSelectionRule("any");
      setSelectionCount(1);
      setSelectionErrorMessage("");
    }
  };

  const updateOption = (value: string, changes: Partial<QuestionOption>) => {
    setOptions((previous) => previous.map((option) => option.value === value ? { ...option, ...changes } : option));
  };

  const toggleCorrect = (value: string) => {
    setOptions((previous) =>
      previous.map((option) => {
        if (option.value !== value) return option;
        const nextCorrect = !option.isCorrect;
        return {
          ...option,
          isCorrect: nextCorrect,
          points: nextCorrect ? Math.max(1, option.points ?? 1) : 0,
        };
      }),
    );
  };

  const adjustPoints = (value: string, delta: number) => {
    setOptions((previous) =>
      previous.map((option) => {
        if (option.value !== value) return option;
        const nextPoints = Math.max(0, (option.points ?? (option.isCorrect ? 1 : 0)) + delta);
        return {
          ...option,
          points: nextPoints,
          isCorrect: nextPoints > 0,
        };
      }),
    );
  };

  const setPoints = (value: string, raw: string) => {
    const parsed = Number.parseInt(raw.replace(/\D/g, ""), 10);
    const nextPoints = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setOptions((previous) =>
      previous.map((option) => {
        if (option.value !== value) return option;
        return {
          ...option,
          points: nextPoints,
          isCorrect: nextPoints > 0,
        };
      }),
    );
  };

  const addOption = (kind?: "row" | "choice") => {
    const base = kind === "row" ? "Fila" : "Opción";
    setOptions((previous) => [...previous, makeOption(previous.length, `${base} ${previous.filter((item) => item.kind === kind).length + 1}`, kind)]);
  };

  const removeOption = (value: string) => setOptions((previous) => previous.filter((option) => option.value !== value));

  const cleanOptions = () => {
    if (!OPTION_BASED_TYPES.includes(type) && type !== "dropdown_matrix" && type !== "slider") return [];
    const allowScoring = scoringEnabled && SCORABLE_TYPES.includes(type);
    return options.filter((option) => option.label.trim()).map((option) => {
      const cleaned: QuestionOption = {
        ...option,
        label: option.label.trim(),
        imageUrl: option.imageUrl?.trim() || undefined,
      };
      if (!allowScoring) {
        delete cleaned.isCorrect;
        delete cleaned.points;
        return cleaned;
      }
      if (cleaned.isCorrect) {
        cleaned.points = Math.max(1, Math.floor(cleaned.points ?? 1));
      } else {
        cleaned.isCorrect = false;
        cleaned.points = 0;
      }
      return cleaned;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const cleanedOptions = cleanOptions();
      const requestedCount = Number.isFinite(selectionCount) ? selectionCount : 1;
      const normalizedCount = Math.max(1, Math.min(requestedCount, cleanedOptions.length));
      const hasSelectionRule = type === "multi_choice" && selectionRule !== "any";
      const nextScoring = scoringEnabled && SCORABLE_TYPES.includes(type);
      await onSubmit({
        title: title.trim(),
        type,
        options: nextScoring ? cleanedOptions : stripScoring(cleanedOptions),
        required,
        scoringEnabled: nextScoring,
        minSelections: hasSelectionRule && selectionRule !== "at_most" ? normalizedCount : null,
        maxSelections: hasSelectionRule && selectionRule !== "at_least" ? normalizedCount : null,
        selectionErrorMessage:
          hasSelectionRule && selectionErrorMessage.trim()
            ? selectionErrorMessage.trim()
            : null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const regularOptions = options.filter((option) => !option.kind);
  const matrixRows = options.filter((option) => option.kind === "row");
  const matrixChoices = options.filter((option) => option.kind === "choice");
  const canScore = SCORABLE_TYPES.includes(type);
  const maxPoints = questionMaxPoints({
    type,
    options: regularOptions,
    scoringEnabled: scoringEnabled && canScore,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initialValues ? `Editar pregunta${code ? ` ${code}` : ""}` : "Nueva pregunta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-title">Pregunta</Label>
            <Input id="question-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="¿Qué querés preguntar?" autoFocus required />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">Tipo de pregunta</legend>
            <div className="grid gap-4 md:grid-cols-3">
              {QUESTION_TYPE_GROUPS.map((group) => (
                <div key={group.label} className={cn("space-y-1", group.label === "Formularios" && "md:col-span-3")}>
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
                  <div className={cn(group.label === "Formularios" && "md:grid md:grid-cols-3")}>
                    {group.types.map((questionType) => (
                      <button key={questionType} type="button" onClick={() => chooseType(questionType)} aria-pressed={type === questionType} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted aria-pressed:bg-[#F5E5A7] aria-pressed:font-medium">
                        <QuestionTypeIcon type={questionType} className="size-4 shrink-0" />
                        <span>{QUESTION_TYPE_LABELS[questionType]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between border-t pt-4">
            <Label htmlFor="question-required">Obligatoria</Label>
            <Switch id="question-required" checked={required} onCheckedChange={setRequired} />
          </div>

          {canScore && (
            <div className="flex items-center gap-3 border-t pt-4">
              <input
                id="question-scoring"
                type="checkbox"
                checked={scoringEnabled}
                onChange={(event) => setScoringEnabled(event.target.checked)}
                className="size-4 accent-emerald-600"
              />
              <Label htmlFor="question-scoring" className="cursor-pointer font-normal">
                Calificar esta pregunta (habilitar el modo de test)
              </Label>
            </div>
          )}

          {type === "dropdown_matrix" ? (
            <div className="grid gap-5 border-t pt-4 sm:grid-cols-2">
              <OptionEditor title="Filas" options={matrixRows} onUpdate={updateOption} onRemove={removeOption} onAdd={() => addOption("row")} />
              <OptionEditor title="Opciones de cada menú" options={matrixChoices} onUpdate={updateOption} onRemove={removeOption} onAdd={() => addOption("choice")} />
            </div>
          ) : OPTION_BASED_TYPES.includes(type) ? (
            <div className="border-t pt-4">
              <OptionEditor
                title={optionHeading(type)}
                options={regularOptions}
                imageUrls={type === "image_choice"}
                scoring={scoringEnabled && canScore}
                onUpdate={updateOption}
                onToggleCorrect={toggleCorrect}
                onAdjustPoints={adjustPoints}
                onSetPoints={setPoints}
                onRemove={removeOption}
                onAdd={() => addOption()}
              />
              {scoringEnabled && canScore && (
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Puntuación máxima: {pointsLabel(maxPoints)}
                </p>
              )}
            </div>
          ) : null}

          {type === "multi_choice" && (
            <div className="flex flex-col gap-4 border-t pt-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="selection-rule">
                  Cantidad de opciones que deben responder los encuestados
                </Label>
                <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                  <select
                    id="selection-rule"
                    value={selectionRule}
                    onChange={(event) => setSelectionRule(event.target.value as SelectionRule)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="any">Cualquier cantidad</option>
                    <option value="exactly">Exactamente</option>
                    <option value="at_least">Como mínimo</option>
                    <option value="at_most">Como máximo</option>
                  </select>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, regularOptions.length)}
                    value={selectionCount}
                    onChange={(event) => setSelectionCount(Number(event.target.value))}
                    disabled={selectionRule === "any"}
                    aria-label="Cantidad de opciones"
                  />
                </div>
                {selectionRule !== "any" && selectionRule !== "at_least" && (
                  <p className="text-xs text-muted-foreground">
                    Al llegar al máximo, las opciones restantes se deshabilitan automáticamente.
                  </p>
                )}
              </div>

              {selectionRule !== "any" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="selection-error-message">Mensaje de validación</Label>
                  <Textarea
                    id="selection-error-message"
                    value={selectionErrorMessage}
                    onChange={(event) => setSelectionErrorMessage(event.target.value)}
                    placeholder="Por favor, seleccioná la cantidad indicada de opciones"
                  />
                </div>
              )}
            </div>
          )}

          {type === "slider" && (
            <div className="flex flex-col gap-3 border-t pt-4">
              <Label>Etiquetas de rango de escala</Label>
              {([
                ["scale_left", "Lado izquierdo", "0"],
                ["scale_center", "Centro", "Ingresar una etiqueta (opcional)"],
                ["scale_right", "Lado derecho", "100"],
              ] as const).map(([kind, label, placeholder]) => {
                const option = options.find((item) => item.kind === kind)!;
                return (
                  <label key={kind} className="grid items-center gap-2 text-sm sm:grid-cols-[140px_1fr]">
                    <span>{label}</span>
                    <Input
                      value={option.label}
                      onChange={(event) => updateOption(option.value, { label: event.target.value })}
                      placeholder={placeholder}
                      required={kind !== "scale_center"}
                    />
                  </label>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OptionEditor({
  title,
  options,
  imageUrls = false,
  scoring = false,
  onUpdate,
  onToggleCorrect,
  onAdjustPoints,
  onSetPoints,
  onRemove,
  onAdd,
}: {
  title: string;
  options: QuestionOption[];
  imageUrls?: boolean;
  scoring?: boolean;
  onUpdate: (value: string, changes: Partial<QuestionOption>) => void;
  onToggleCorrect?: (value: string) => void;
  onAdjustPoints?: (value: string, delta: number) => void;
  onSetPoints?: (value: string, raw: string) => void;
  onRemove: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{title}</Label>
      {options.map((option, index) => {
        const pointsValue = option.isCorrect ? Math.max(1, option.points ?? 1) : (option.points ?? 0);
        return (
          <div key={option.value} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
            {scoring && onToggleCorrect && (
              <button
                type="button"
                onClick={() => onToggleCorrect(option.value)}
                aria-pressed={Boolean(option.isCorrect)}
                aria-label={option.isCorrect ? "Marcar como incorrecta" : "Marcar como correcta"}
                className={cn(
                  "mt-1 flex size-8 shrink-0 items-center justify-center rounded-md border",
                  option.isCorrect
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-muted-foreground/40 text-muted-foreground hover:bg-muted",
                )}
              >
                <Check className="size-4" strokeWidth={option.isCorrect ? 3 : 2} />
              </button>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Input
                value={option.label}
                onChange={(event) => onUpdate(option.value, { label: event.target.value })}
                placeholder={`Opción ${index + 1}`}
                required
              />
              {imageUrls && (
                <Input
                  value={option.imageUrl ?? ""}
                  onChange={(event) => onUpdate(option.value, { imageUrl: event.target.value })}
                  placeholder="URL de la imagen"
                  type="url"
                />
              )}
            </div>
            {scoring && onAdjustPoints && onSetPoints && (
              <div className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5">
                <span className="px-1 text-xs font-medium text-muted-foreground">Puntos</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onAdjustPoints(option.value, -1)}
                  disabled={pointsValue <= 0}
                  aria-label="Restar punto"
                >
                  <Minus className="size-3.5" />
                </Button>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={String(pointsValue)}
                  onChange={(event) => onSetPoints(option.value, event.target.value)}
                  aria-label={`Puntos para ${option.label || `opción ${index + 1}`}`}
                  className="h-7 w-12 px-1 text-center text-sm tabular-nums"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onAdjustPoints(option.value, 1)}
                  aria-label="Sumar punto"
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            )}
            {options.length > 1 && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => onRemove(option.value)}
                aria-label={`Eliminar ${option.label}`}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        );
      })}
      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        <Plus className="size-3.5" /> Agregar
      </Button>
    </div>
  );
}
