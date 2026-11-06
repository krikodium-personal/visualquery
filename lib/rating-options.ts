import type { QuestionOption } from "@/lib/question-options";

export const RATING_SHAPES = [
  { value: "star", label: "Estrella" },
  { value: "heart", label: "Corazón" },
  { value: "thumb", label: "Pulgar" },
] as const;

export type RatingShape = (typeof RATING_SHAPES)[number]["value"];

export const DEFAULT_RATING_COLOR = "#404040";

export const DEFAULT_RATING_LABELS = [
  "Malo",
  "Regular",
  "Bueno",
  "Muy bueno",
  "Excelente",
] as const;

const META_KINDS = new Set(["rating_shape", "rating_color", "rating_labels"]);

export function isRatingMeta(option: QuestionOption): boolean {
  return Boolean(option.kind && META_KINDS.has(option.kind));
}

export function isRatingLevel(option: QuestionOption): boolean {
  return !isRatingMeta(option) && option.kind !== "other" && option.kind !== "none";
}

export function starCountLabel(n: number): string {
  return n === 1 ? "1 estrella" : `${n} estrellas`;
}

export function defaultRatingOptions(): QuestionOption[] {
  return [
    { value: "shape", label: "star", kind: "rating_shape" },
    { value: "color", label: DEFAULT_RATING_COLOR, kind: "rating_color" },
    { value: "labels", label: "on", kind: "rating_labels" },
    ...DEFAULT_RATING_LABELS.map((label, index) => ({
      value: String(index + 1),
      label,
      kind: "choice" as const,
    })),
  ];
}

export type RatingConfig = {
  shape: RatingShape;
  color: string;
  labelsEnabled: boolean;
  levels: QuestionOption[];
  hasNa: boolean;
  hasOther: boolean;
  naOption: QuestionOption | undefined;
  otherOption: QuestionOption | undefined;
};

export function parseRatingConfig(options: QuestionOption[]): RatingConfig {
  const shapeRaw = options.find((o) => o.kind === "rating_shape")?.label ?? "star";
  const shape = (RATING_SHAPES.some((s) => s.value === shapeRaw) ? shapeRaw : "star") as RatingShape;
  const color = options.find((o) => o.kind === "rating_color")?.label || DEFAULT_RATING_COLOR;
  const labelsEnabled = (options.find((o) => o.kind === "rating_labels")?.label ?? "on") !== "off";

  let levels = options.filter(isRatingLevel);
  if (levels.length === 0) {
    levels = DEFAULT_RATING_LABELS.map((label, index) => ({
      value: String(index + 1),
      label: labelsEnabled ? label : starCountLabel(index + 1),
      kind: "choice" as const,
    }));
  }

  const naOption = options.find((o) => o.kind === "none");
  const otherOption = options.find((o) => o.kind === "other");

  return {
    shape,
    color,
    labelsEnabled,
    levels,
    hasNa: Boolean(naOption),
    hasOther: Boolean(otherOption),
    naOption,
    otherOption,
  };
}

export function buildRatingOptions(config: {
  shape: RatingShape;
  color: string;
  labelsEnabled: boolean;
  levels: { value: string; label: string }[];
  hasNa: boolean;
  hasOther: boolean;
  naOption?: QuestionOption;
  otherOption?: QuestionOption;
}): QuestionOption[] {
  const levels = config.levels.map((level, index) => {
    const trimmed = level.label.trim();
    const label = config.labelsEnabled
      ? trimmed || starCountLabel(index + 1)
      : starCountLabel(index + 1);
    const value = level.value.trim() || String(index + 1);
    return { value, label, kind: "choice" as const };
  });

  const next: QuestionOption[] = [
    { value: "shape", label: config.shape, kind: "rating_shape" },
    { value: "color", label: config.color || DEFAULT_RATING_COLOR, kind: "rating_color" },
    { value: "labels", label: config.labelsEnabled ? "on" : "off", kind: "rating_labels" },
    ...levels,
  ];

  if (config.hasNa) {
    next.push(config.naOption?.kind === "none" ? config.naOption : { value: "na", label: "N/A", kind: "none" });
  }
  if (config.hasOther) {
    next.push(
      config.otherOption?.kind === "other"
        ? config.otherOption
        : {
            value: `other-${crypto.randomUUID().slice(2, 8)}`,
            label: "Otra (especificar)",
            kind: "other",
          },
    );
  }

  return next;
}
