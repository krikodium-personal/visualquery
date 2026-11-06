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

/** SurveyMonkey-style star scale sizes (Escala). */
export const RATING_SCALES = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type RatingScale = (typeof RATING_SCALES)[number];
export const DEFAULT_RATING_SCALE: RatingScale = 5;

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

export function defaultLabelForLevel(index: number, labelsEnabled: boolean): string {
  if (!labelsEnabled) return starCountLabel(index + 1);
  return DEFAULT_RATING_LABELS[index] ?? starCountLabel(index + 1);
}

export function resizeRatingLevels(
  levels: { value: string; label: string }[],
  scale: number,
  labelsEnabled: boolean,
): { value: string; label: string }[] {
  const size = Math.max(
    RATING_SCALES[0],
    Math.min(RATING_SCALES[RATING_SCALES.length - 1], Math.round(scale)),
  );
  return Array.from({ length: size }, (_, index) => {
    const existing = levels[index];
    return {
      value: String(index + 1),
      label: existing?.label?.trim()
        ? existing.label
        : defaultLabelForLevel(index, labelsEnabled),
    };
  });
}

export function ratingScaleFromLevels(levels: { value: string }[]): RatingScale {
  const count = levels.length || DEFAULT_RATING_SCALE;
  const match = RATING_SCALES.find((scale) => scale === count);
  if (match) return match;
  if (count < RATING_SCALES[0]) return RATING_SCALES[0];
  if (count > RATING_SCALES[RATING_SCALES.length - 1]) {
    return RATING_SCALES[RATING_SCALES.length - 1];
  }
  return DEFAULT_RATING_SCALE;
}

/** Max numeric value for charts / averages (custom Valors or level count). */
export function ratingMaxFromOptions(options: QuestionOption[]): number {
  const levels = options.filter(isRatingLevel);
  if (levels.length === 0) return DEFAULT_RATING_SCALE;
  const values = levels
    .map((level) => Number(level.value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return levels.length;
  return Math.max(...values, levels.length);
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
  // Don't trim labels here — live edits call this on every keystroke and
  // trimming would swallow spaces ("Muy " → "Muy"). cleanOptions trims on save.
  const levels = config.levels.map((level, index) => {
    const label = config.labelsEnabled
      ? (level.label === "" ? starCountLabel(index + 1) : level.label)
      : starCountLabel(index + 1);
    const value = level.value === "" ? String(index + 1) : level.value;
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
