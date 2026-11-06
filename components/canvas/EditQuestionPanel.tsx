"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Check, Heart, Minus, Plus, Star, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageSourceField } from "@/components/ui/image-source-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuestionTypeIcon } from "@/components/questions/QuestionTypeIcon";
import {
  BRANCHABLE_TYPES,
  OPTION_BASED_TYPES,
  QUESTION_TYPE_GROUPS,
  QUESTION_TYPE_LABELS,
  SCORABLE_TYPES,
  type QuestionType,
} from "@/lib/question-types";
import {
  RATING_SCALES,
  RATING_SHAPES,
  buildRatingOptions,
  defaultLabelForLevel,
  defaultRatingOptions,
  parseRatingConfig,
  ratingScaleFromLevels,
  resizeRatingLevels,
  starCountLabel,
  type RatingShape,
} from "@/lib/rating-options";
import { questionMaxPoints, pointsLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { QuestionOption } from "./QuestionNode";

export type { QuestionType };

export type LogicTarget = { id: string; code: string; title: string };

export type QuestionFormValues = {
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  required: boolean;
  scoringEnabled: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
  requiredErrorMessage: string | null;
  randomizeOptions: boolean;
  /** option value → target question id; key `__default__` = default next edge */
  optionLogic: Record<string, string | null>;
};

type SelectionRule = "any" | "exactly" | "at_least" | "at_most";
type EditorTab = "edit" | "options" | "logic";

const OTHER_VALUE_PREFIX = "other-";
const NONE_VALUE_PREFIX = "none-";

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
  return { value: `opcion-${index + 1}-${crypto.randomUUID().slice(2, 8)}`, label, kind };
}

/** Default labels like "Opción 4" / "Fila 1" — clear them on focus so the user can type. */
function isDefaultOptionLabel(label: string): boolean {
  return /^(Opción|Fila|Campo|Aspecto|Elemento)\s+\d+$/i.test(label.trim());
}

function makeOtherOption(): QuestionOption {
  return {
    value: `${OTHER_VALUE_PREFIX}${crypto.randomUUID().slice(2, 8)}`,
    label: "Otra (especificar)",
    kind: "other",
  };
}

function makeNoneOption(): QuestionOption {
  return {
    value: `${NONE_VALUE_PREFIX}${crypto.randomUUID().slice(2, 8)}`,
    label: "Ninguna de las anteriores",
    kind: "none",
  };
}

function defaultOptions(type: QuestionType): QuestionOption[] {
  if (type === "rating") return defaultRatingOptions();
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
  if (type === "rating") {
    if (!stored?.length) return defaultRatingOptions();
    const config = parseRatingConfig(stored);
    return buildRatingOptions({
      shape: config.shape,
      color: config.color,
      labelsEnabled: config.labelsEnabled,
      levels: config.levels.map((level) => ({ value: level.value, label: level.label })),
      hasNa: config.hasNa,
      hasOther: config.hasOther,
      naOption: config.naOption,
      otherOption: config.otherOption,
    });
  }
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

function supportsOtherNone(type: QuestionType): boolean {
  return type === "single_choice" || type === "multi_choice" || type === "dropdown";
}

export function EditQuestionPanel({
  open,
  onOpenChange,
  initialValues,
  code,
  logicTargets = [],
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: QuestionFormValues;
  code?: string;
  logicTargets?: LogicTarget[];
  onSubmit: (values: QuestionFormValues) => Promise<void>;
}) {
  const [tab, setTab] = useState<EditorTab>("edit");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<QuestionType>("single_choice");
  const [options, setOptions] = useState<QuestionOption[]>([]);
  const [required, setRequired] = useState(true);
  const [scoringEnabled, setScoringEnabled] = useState(false);
  const [selectionRule, setSelectionRule] = useState<SelectionRule>("any");
  const [selectionCount, setSelectionCount] = useState(1);
  const [selectionErrorMessage, setSelectionErrorMessage] = useState("");
  const [requiredErrorMessage, setRequiredErrorMessage] = useState("");
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [optionLogic, setOptionLogic] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const nextType = initialValues?.type ?? "single_choice";
      setTab("edit");
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
      setRequiredErrorMessage(initialValues?.requiredErrorMessage ?? "");
      setRandomizeOptions(Boolean(initialValues?.randomizeOptions));
      setOptionLogic(initialValues?.optionLogic ?? {});
    }
  }

  const regularOptions = options.filter(
    (option) => !option.kind || option.kind === "choice",
  );
  const specialOptions = options.filter(
    (option) => option.kind === "other" || option.kind === "none",
  );
  const editableOptions = [...regularOptions, ...specialOptions];
  const matrixRows = options.filter((option) => option.kind === "row");
  const matrixChoices = options.filter((option) => option.kind === "choice");
  const hasOther = options.some((option) => option.kind === "other");
  const hasNone = options.some((option) => option.kind === "none");
  const canScore = SCORABLE_TYPES.includes(type);
  const canLogic = BRANCHABLE_TYPES.includes(type);
  const maxPoints = questionMaxPoints({
    type,
    options: regularOptions,
    scoringEnabled: scoringEnabled && canScore,
  });

  const logicRows = useMemo(() => {
    if (!canLogic) return [] as { key: string; label: string }[];
    return [
      ...editableOptions.map((option) => ({
        key: option.value,
        label: option.label || option.value,
      })),
      { key: "__default__", label: "Siguiente (por defecto)" },
    ];
  }, [canLogic, editableOptions]);

  const chooseType = (nextType: QuestionType) => {
    if (nextType === type) return;
    setType(nextType);
    setOptions(defaultOptions(nextType));
    setOptionLogic({});
    if (!SCORABLE_TYPES.includes(nextType)) setScoringEnabled(false);
    if (nextType !== "multi_choice") {
      setSelectionRule("any");
      setSelectionCount(1);
      setSelectionErrorMessage("");
    }
  };

  const updateOption = (value: string, changes: Partial<QuestionOption>) => {
    setOptions((previous) =>
      previous.map((option) => (option.value === value ? { ...option, ...changes } : option)),
    );
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
        return { ...option, points: nextPoints, isCorrect: nextPoints > 0 };
      }),
    );
  };

  const setPoints = (value: string, raw: string) => {
    const parsed = Number.parseInt(raw.replace(/\D/g, ""), 10);
    const nextPoints = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setOptions((previous) =>
      previous.map((option) =>
        option.value === value
          ? { ...option, points: nextPoints, isCorrect: nextPoints > 0 }
          : option,
      ),
    );
  };

  const addOption = (kind?: "row" | "choice") => {
    setOptions((previous) => {
      const specials = previous.filter((o) => o.kind === "other" || o.kind === "none");
      const normals = previous.filter((o) => o.kind !== "other" && o.kind !== "none");
      // Empty label + placeholder: focus starts ready to type (no "Opción N" to erase).
      return [...normals, makeOption(normals.length, "", kind), ...specials];
    });
  };

  const removeOption = (value: string) => {
    setOptions((previous) => previous.filter((option) => option.value !== value));
    setOptionLogic((previous) => {
      const next = { ...previous };
      delete next[value];
      return next;
    });
  };

  const setHasOther = (enabled: boolean) => {
    setOptions((previous) => {
      const without = previous.filter((option) => option.kind !== "other");
      return enabled ? [...without, makeOtherOption()] : without;
    });
  };

  const setHasNone = (enabled: boolean) => {
    setOptions((previous) => {
      const without = previous.filter((option) => option.kind !== "none");
      return enabled ? [...without, makeNoneOption()] : without;
    });
  };

  const reverseOptions = () => {
    setOptions((previous) => {
      const specials = previous.filter((o) => o.kind === "other" || o.kind === "none");
      const normals = previous.filter((o) => o.kind !== "other" && o.kind !== "none");
      return [...normals.reverse(), ...specials];
    });
  };

  const cleanOptions = () => {
    if (type === "rating") {
      const config = parseRatingConfig(options);
      return buildRatingOptions({
        shape: config.shape,
        color: config.color,
        labelsEnabled: config.labelsEnabled,
        levels: config.levels.map((level, index) => ({
          value: level.value.trim() || String(index + 1),
          label: config.labelsEnabled
            ? level.label.trim() || starCountLabel(index + 1)
            : starCountLabel(index + 1),
        })),
        hasNa: config.hasNa,
        hasOther: config.hasOther,
        naOption: config.naOption,
        otherOption: config.otherOption,
      });
    }
    if (!OPTION_BASED_TYPES.includes(type) && type !== "dropdown_matrix" && type !== "slider") {
      return [];
    }
    const allowScoring = scoringEnabled && SCORABLE_TYPES.includes(type);
    return options
      .filter((option) => {
        if (option.kind === "other" || option.kind === "none") return true;
        return option.label.trim().length > 0 && !isDefaultOptionLabel(option.label);
      })
      .map((option) => {
        const cleaned: QuestionOption = {
          ...option,
          label: option.label.trim() || (option.kind === "other"
            ? "Otra (especificar)"
            : option.kind === "none"
              ? "Ninguna de las anteriores"
              : option.label),
          imageUrl: option.imageUrl?.trim() || undefined,
        };
        if (!allowScoring) {
          delete cleaned.isCorrect;
          delete cleaned.points;
          return cleaned;
        }
        if (cleaned.isCorrect) cleaned.points = Math.max(1, Math.floor(cleaned.points ?? 1));
        else {
          cleaned.isCorrect = false;
          cleaned.points = 0;
        }
        return cleaned;
      });
  };

  const patchRating = (
    patch: Partial<{
      shape: RatingShape;
      color: string;
      labelsEnabled: boolean;
      hasNa: boolean;
      hasOther: boolean;
      levels: { value: string; label: string }[];
    }>,
  ) => {
    setOptions((previous) => {
      const config = parseRatingConfig(previous);
      const labelsEnabled = patch.labelsEnabled ?? config.labelsEnabled;
      let levels = (patch.levels ?? config.levels.map((level) => ({
        value: level.value,
        label: level.label,
      }))).map((level) => ({ ...level }));

      if (patch.labelsEnabled === true && !config.labelsEnabled) {
        levels = levels.map((level, index) => ({
          ...level,
          label: defaultLabelForLevel(index, true),
        }));
      }

      return buildRatingOptions({
        shape: patch.shape ?? config.shape,
        color: patch.color ?? config.color,
        labelsEnabled,
        levels,
        hasNa: patch.hasNa ?? config.hasNa,
        hasOther: patch.hasOther ?? config.hasOther,
        naOption: config.naOption,
        otherOption: config.otherOption,
      });
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const cleanedOptions = cleanOptions();
      const requestedCount = Number.isFinite(selectionCount) ? selectionCount : 1;
      const choiceCount = cleanedOptions.filter(
        (o) => o.kind !== "other" && o.kind !== "none",
      ).length;
      const normalizedCount = Math.max(1, Math.min(requestedCount, Math.max(1, choiceCount)));
      const hasSelectionRule = type === "multi_choice" && selectionRule !== "any";
      const nextScoring = scoringEnabled && SCORABLE_TYPES.includes(type);
      const cleanedLogic: Record<string, string | null> = {};
      for (const [key, target] of Object.entries(optionLogic)) {
        if (key === "__default__" || cleanedOptions.some((o) => o.value === key)) {
          cleanedLogic[key] = target;
        }
      }
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
        requiredErrorMessage:
          required && requiredErrorMessage.trim() ? requiredErrorMessage.trim() : null,
        randomizeOptions: OPTION_BASED_TYPES.includes(type) ? randomizeOptions : false,
        optionLogic: cleanedLogic,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initialValues ? `Editar pregunta${code ? ` ${code}` : ""}` : "Nueva pregunta"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b">
          {(
            [
              ["edit", "Editar"],
              ["options", "Opciones"],
              ["logic", "Lógica"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {tab === "edit" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="question-title">Pregunta</Label>
                <Input
                  id="question-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="¿Qué querés preguntar?"
                  autoFocus
                  required
                />
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-sm font-medium">Tipo de pregunta</legend>
                <div className="grid gap-4 md:grid-cols-3">
                  {QUESTION_TYPE_GROUPS.map((group) => (
                    <div
                      key={group.label}
                      className={cn("space-y-1", group.label === "Formularios" && "md:col-span-3")}
                    >
                      <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">
                        {group.label}
                      </p>
                      <div className={cn(group.label === "Formularios" && "md:grid md:grid-cols-3")}>
                        {group.types.map((questionType) => (
                          <button
                            key={questionType}
                            type="button"
                            onClick={() => chooseType(questionType)}
                            aria-pressed={type === questionType}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted aria-pressed:bg-[#F5E5A7] aria-pressed:font-medium"
                          >
                            <QuestionTypeIcon type={questionType} className="size-4 shrink-0" />
                            <span>{QUESTION_TYPE_LABELS[questionType]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>

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
                  <OptionEditor
                    title="Filas"
                    options={matrixRows}
                    onUpdate={updateOption}
                    onRemove={removeOption}
                    onAdd={() => addOption("row")}
                  />
                  <OptionEditor
                    title="Opciones de cada menú"
                    options={matrixChoices}
                    onUpdate={updateOption}
                    onRemove={removeOption}
                    onAdd={() => addOption("choice")}
                  />
                </div>
              ) : OPTION_BASED_TYPES.includes(type) ? (
                <div className="border-t pt-4">
                  <OptionEditor
                    title={optionHeading(type)}
                    options={editableOptions}
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
                  {supportsOtherNone(type) ? (
                    <div className="mt-4 flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="accent-foreground"
                          checked={hasOther}
                          onChange={(event) => setHasOther(event.target.checked)}
                        />
                        Agregar opción «Otra (especificar)»
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="accent-foreground"
                          checked={hasNone}
                          onChange={(event) => setHasNone(event.target.checked)}
                        />
                        Agregar «Ninguna de las anteriores»
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {type === "slider" && (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <Label>Etiquetas de rango de escala</Label>
                  {(
                    [
                      ["scale_left", "Lado izquierdo", "0"],
                      ["scale_center", "Centro", "Ingresar una etiqueta (opcional)"],
                      ["scale_right", "Lado derecho", "100"],
                    ] as const
                  ).map(([kind, label, placeholder]) => {
                    const option = options.find((item) => item.kind === kind)!;
                    return (
                      <label
                        key={kind}
                        className="grid items-center gap-2 text-sm sm:grid-cols-[140px_1fr]"
                      >
                        <span>{label}</span>
                        <Input
                          value={option.label}
                          onChange={(event) =>
                            updateOption(option.value, { label: event.target.value })
                          }
                          placeholder={placeholder}
                          required={kind !== "scale_center"}
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              {type === "rating" && (
                <RatingEditor options={options} onPatch={patchRating} />
              )}
            </>
          ) : null}

          {tab === "options" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="question-required">Exigir una respuesta</Label>
                  <p className="text-xs text-muted-foreground">
                    Como en SurveyMonkey: el encuestado no puede continuar sin responder.
                  </p>
                </div>
                <Switch id="question-required" checked={required} onCheckedChange={setRequired} />
              </div>

              {required ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="required-error">Mensaje si dejan la pregunta en blanco</Label>
                  <Textarea
                    id="required-error"
                    value={requiredErrorMessage}
                    onChange={(event) => setRequiredErrorMessage(event.target.value)}
                    placeholder="Esta pregunta es obligatoria."
                  />
                </div>
              ) : null}

              {OPTION_BASED_TYPES.includes(type) ? (
                <div className="flex flex-col gap-3 border-t pt-4">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">Ordenar opciones al azar</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Cada encuestado ve las opciones en un orden distinto.
                      </span>
                    </span>
                    <Switch checked={randomizeOptions} onCheckedChange={setRandomizeOptions} />
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={reverseOptions}>
                    Invertir orden de las opciones
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Próximamente: tamaño/diseño de la pregunta, reenviar respuestas y piping.
                  </p>
                </div>
              ) : null}

              {type === "multi_choice" && (
                <div className="flex flex-col gap-4 border-t pt-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-rule">
                      Cantidad de opciones que deben responder
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                      <select
                        id="selection-rule"
                        value={selectionRule}
                        onChange={(event) =>
                          setSelectionRule(event.target.value as SelectionRule)
                        }
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
            </>
          ) : null}

          {tab === "logic" ? (
            <div className="flex flex-col gap-4">
              {!canLogic ? (
                <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
                  La lógica por respuesta aplica a opción múltiple, casillas, menú desplegable y
                  elección de imagen. También podés conectar flechas en el canvas.
                </p>
              ) : logicTargets.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
                  Agregá más preguntas al canvas para definir saltos. Mientras tanto, usá «+» en
                  cada opción del nodo.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Para cada respuesta, elegí a qué pregunta saltar (como SurveyMonkey Question
                    Skip Logic). Dejá «Sin cambio» para no definir un salto desde acá.
                  </p>
                  <div className="flex flex-col gap-3">
                    {logicRows.map((row) => (
                      <label
                        key={row.key}
                        className="grid gap-1.5 rounded-lg border px-3 py-2 text-sm sm:grid-cols-[1fr_1fr] sm:items-center"
                      >
                        <span className="font-medium">Si responde «{row.label}»</span>
                        <select
                          className="h-9 rounded-md border bg-background px-2 text-sm"
                          value={optionLogic[row.key] ?? ""}
                          onChange={(event) =>
                            setOptionLogic((current) => ({
                              ...current,
                              [row.key]: event.target.value || null,
                            }))
                          }
                        >
                          <option value="">Sin cambio / usar canvas</option>
                          {logicTargets.map((target) => (
                            <option key={target.id} value={target.id}>
                              P{target.code}. {target.title || "Sin título"}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RatingShapeIcon({
  shape,
  className,
  style,
}: {
  shape: RatingShape;
  className?: string;
  style?: CSSProperties;
}) {
  if (shape === "heart") return <Heart className={className} style={style} />;
  if (shape === "thumb") return <ThumbsUp className={className} style={style} />;
  return <Star className={className} style={style} />;
}

function RatingEditor({
  options,
  onPatch,
}: {
  options: QuestionOption[];
  onPatch: (
    patch: Partial<{
      shape: RatingShape;
      color: string;
      labelsEnabled: boolean;
      hasNa: boolean;
      hasOther: boolean;
      levels: { value: string; label: string }[];
    }>,
  ) => void;
}) {
  const config = parseRatingConfig(options);
  const scale = ratingScaleFromLevels(config.levels);
  const shapeLabel =
    RATING_SHAPES.find((item) => item.value === config.shape)?.label ?? "Estrella";

  const updateLevel = (index: number, changes: Partial<{ value: string; label: string }>) => {
    const levels = config.levels.map((level, levelIndex) =>
      levelIndex === index
        ? {
            value: changes.value ?? level.value,
            label: changes.label ?? level.label,
          }
        : { value: level.value, label: level.label },
    );
    onPatch({ levels });
  };

  const setScale = (nextScale: number) => {
    onPatch({
      levels: resizeRatingLevels(
        config.levels.map((level) => ({ value: level.value, label: level.label })),
        nextScale,
        config.labelsEnabled,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label>Escala</Label>
          <Select
            value={String(scale)}
            onValueChange={(value) => setScale(Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{() => String(scale)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RATING_SCALES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Forma</Label>
          <Select
            value={config.shape}
            onValueChange={(value) => onPatch({ shape: value as RatingShape })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{() => shapeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RATING_SHAPES.map((shape) => (
                <SelectItem key={shape.value} value={shape.value}>
                  {shape.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rating-color">Color</Label>
          <div className="flex items-center gap-2">
            <input
              id="rating-color"
              type="color"
              value={config.color}
              onChange={(event) => onPatch({ color: event.target.value })}
              className="size-9 cursor-pointer rounded-md border bg-transparent p-1"
              aria-label="Color de la valoración"
            />
            <RatingShapeIcon
              shape={config.shape}
              className="size-6"
              style={{ color: config.color }}
            />
            <Input
              value={config.color}
              onChange={(event) => onPatch({ color: event.target.value })}
              className="font-mono text-sm uppercase"
              aria-label="Código de color"
            />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-emerald-600"
          checked={config.labelsEnabled}
          onChange={(event) => onPatch({ labelsEnabled: event.target.checked })}
        />
        Agregar etiquetas de calificación
      </label>

      {config.labelsEnabled ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2 px-0.5 text-xs font-medium text-muted-foreground">
            <span />
            <span>Etiqueta</span>
            <span className="text-center">Valor</span>
          </div>
          {config.levels.map((level, index) => (
            <div
              key={`${level.value}-${index}`}
              className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-2"
            >
              <span className="text-sm text-muted-foreground">{starCountLabel(index + 1)}</span>
              <Input
                value={level.label}
                onChange={(event) => updateLevel(index, { label: event.target.value })}
                placeholder={defaultLabelForLevel(index, true)}
              />
              <Input
                type="text"
                inputMode="numeric"
                value={level.value}
                onChange={(event) =>
                  updateLevel(index, { value: event.target.value.replace(/[^\d.-]/g, "") })
                }
                className="text-center tabular-nums"
                aria-label={`Valor para ${starCountLabel(index + 1)}`}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-foreground"
            checked={config.hasNa}
            onChange={(event) => onPatch({ hasNa: event.target.checked })}
          />
          Agregar una columna N/A
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-foreground"
            checked={config.hasOther}
            onChange={(event) => onPatch({ hasOther: event.target.checked })}
          />
          Agregar una opción de respuesta «Otra» para comentarios
        </label>
      </div>
    </div>
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
  const listRef = useRef<HTMLDivElement>(null);
  const pendingFocusNew = useRef(false);
  const valuesBeforeAdd = useRef<string[]>([]);

  const focusOptionInput = (value: string) => {
    requestAnimationFrame(() => {
      const input = listRef.current?.querySelector<HTMLInputElement>(
        `input[data-option-value="${CSS.escape(value)}"]`,
      );
      input?.focus();
    });
  };

  useEffect(() => {
    if (!pendingFocusNew.current) return;
    const added = options.find((option) => !valuesBeforeAdd.current.includes(option.value));
    pendingFocusNew.current = false;
    valuesBeforeAdd.current = [];
    if (added) focusOptionInput(added.value);
  }, [options]);

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Tab" || event.shiftKey) return;
    event.preventDefault();
    if (index < options.length - 1) {
      focusOptionInput(options[index + 1].value);
      return;
    }
    valuesBeforeAdd.current = options.map((option) => option.value);
    pendingFocusNew.current = true;
    onAdd();
  };

  return (
    <div ref={listRef} className="flex flex-col gap-2">
      <Label>{title}</Label>
      {options.map((option, index) => {
        const pointsValue = option.isCorrect
          ? Math.max(1, option.points ?? 1)
          : (option.points ?? 0);
        const isSpecial = option.kind === "other" || option.kind === "none";
        return (
          <div key={option.value} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
            {scoring && onToggleCorrect && !isSpecial && (
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
                data-option-value={option.value}
                value={option.label}
                onChange={(event) => onUpdate(option.value, { label: event.target.value })}
                onFocus={() => {
                  if (isDefaultOptionLabel(option.label)) {
                    onUpdate(option.value, { label: "" });
                  }
                }}
                onKeyDown={(event) => handleLabelKeyDown(event, index)}
                placeholder={`Opción ${index + 1}`}
                required={!isSpecial}
              />
              {imageUrls && !isSpecial && (
                <ImageSourceField
                  id={`option-image-${option.value}`}
                  value={option.imageUrl}
                  onChange={(imageUrl) =>
                    onUpdate(option.value, { imageUrl: imageUrl ?? undefined })
                  }
                  previewFit="cover"
                  compact
                />
              )}
            </div>
            {scoring && onAdjustPoints && onSetPoints && !isSpecial && (
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
            {(options.length > 1 || isSpecial) && (
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
