import type { CSSProperties } from "react";
import { z } from "zod";

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  imageUrl: z.string().optional(),
  // Framing of the visible part of the image (focal point in %, zoom factor).
  imageFocusX: z.number().min(0).max(100).optional(),
  imageFocusY: z.number().min(0).max(100).optional(),
  imageZoom: z.number().min(1).max(4).optional(),
  kind: z
    .enum([
      "row",
      "column",
      "choice",
      "scale_left",
      "scale_center",
      "scale_right",
      "other",
      "none",
      "rating_shape",
      "rating_color",
      "rating_labels",
      "rating_split",
    ])
    .optional(),
  // Dropdown matrix: the column (menu) a "choice" option belongs to. Absent = shared by all.
  columnValue: z.string().optional(),
  // «Otra» / comment field settings (dropdown): only meaningful on the option of kind "other".
  otherMode: z.enum(["option", "comment"]).optional(),
  otherMultiline: z.boolean().optional(),
  otherSize: z.number().int().min(5).max(100).optional(),
  otherValidation: z
    .enum(["any", "text_length", "integer", "decimal", "date_us", "date_intl", "email"])
    .optional(),
  otherMinLength: z.number().int().min(0).max(2000).optional(),
  otherMaxLength: z.number().int().min(1).max(2000).optional(),
  otherErrorMessage: z.string().max(300).optional(),
  otherInvalidMessage: z.string().max(300).optional(),
  // Logic: answering this option ends the survey or disqualifies the respondent.
  action: z.enum(["end", "disqualify"]).optional(),
  // Quota: max completed responses that may pick this option; absent = unlimited.
  quota: z.number().int().positive().max(1_000_000).optional(),
  isCorrect: z.boolean().optional(),
  points: z.number().int().nonnegative().optional(),
});
const optionsSchema = z.array(optionSchema);

export type QuestionOption = z.infer<typeof optionSchema>;

export function parseOptions(options: unknown): QuestionOption[] {
  const parsed = optionsSchema.safeParse(options);
  return parsed.success ? parsed.data : [];
}

/** Inline style that applies an option's image framing to an object-cover <img>. */
export function imageFrameStyle(option: {
  imageFocusX?: number;
  imageFocusY?: number;
  imageZoom?: number;
}): CSSProperties | undefined {
  const x = option.imageFocusX ?? 50;
  const y = option.imageFocusY ?? 50;
  const zoom = option.imageZoom ?? 1;
  if (x === 50 && y === 50 && zoom === 1) return undefined;
  return {
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
  };
}

export function optionPoints(option: QuestionOption): number {
  if (!option.isCorrect) return 0;
  const points = option.points ?? 0;
  return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0;
}

/** Separator of the answer key of a dropdown matrix cell: `${rowValue}::${columnValue}`. */
export const MATRIX_KEY_SEPARATOR = "::";

export function matrixCellKey(rowValue: string, columnValue: string): string {
  return `${rowValue}${MATRIX_KEY_SEPARATOR}${columnValue}`;
}

/** Human label for an answer key; matrix cells become "Fila · Columna". */
export function answerKeyLabel(key: string, labels: Map<string, string>): string {
  if (key.includes(MATRIX_KEY_SEPARATOR)) {
    return key
      .split(MATRIX_KEY_SEPARATOR)
      .map((part) => labels.get(part) ?? part)
      .join(" · ");
  }
  return labels.get(key) ?? key;
}

/**
 * Number of rows of a dropdown matrix that are fully answered. With 2+ columns a row counts
 * once every one of its cells has a value; with a single (legacy) menu, once the row does.
 */
export function countAnsweredMatrixRows(
  options: QuestionOption[],
  answer: Record<string, unknown>,
): number {
  const rows = options.filter((option) => option.kind === "row");
  const columns = options.filter((option) => option.kind === "column");
  const filled = (key: string) => String(answer[key] ?? "").trim() !== "";
  return rows.filter((row) =>
    columns.length >= 2
      ? columns.every((column) => filled(matrixCellKey(row.value, column.value)))
      : filled(row.value),
  ).length;
}

export function matrixRowCount(options: QuestionOption[]): number {
  return options.filter((option) => option.kind === "row").length;
}

// ---------------------------------------------------------------------------
// «Otra» / comment field of dropdown questions
// ---------------------------------------------------------------------------

export type OtherValidation = NonNullable<QuestionOption["otherValidation"]>;

export const OTHER_VALIDATION_LABELS: Record<OtherValidation, string> = {
  any: "No validar esta respuesta.",
  text_length: "Asegúrate de que tenga una longitud específica",
  integer: "Asegúrate de que sea un número entero",
  decimal: "Asegúrate de que sea un número decimal",
  date_us: "Debe ser una fecha (MM/DD/AAAA)",
  date_intl: "Debe ser una fecha (DD/MM/AAAA)",
  email: "Debe ser una dirección de correo electrónico",
};

export const DEFAULT_OTHER_ERROR = "Ingrese un comentario.";
export const DEFAULT_OTHER_INVALID = "El comentario que ingresó no tiene un formato válido.";

export type OtherConfig = {
  mode: "option" | "comment";
  multiline: boolean;
  size: number;
  validation: OtherValidation;
  minLength: number;
  maxLength: number;
  errorMessage: string;
  invalidMessage: string;
};

export function readOtherConfig(option: QuestionOption | undefined): OtherConfig {
  return {
    mode: option?.otherMode ?? "option",
    multiline: option?.otherMultiline ?? false,
    size: option?.otherSize ?? 50,
    validation: option?.otherValidation ?? "any",
    minLength: option?.otherMinLength ?? 0,
    maxLength: option?.otherMaxLength ?? 2000,
    errorMessage: option?.otherErrorMessage?.trim() || DEFAULT_OTHER_ERROR,
    invalidMessage: option?.otherInvalidMessage?.trim() || DEFAULT_OTHER_INVALID,
  };
}

function isRealDate(day: number, month: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Error message for a free-text answer, or null when it is acceptable. */
export function validateOtherText(rawText: string, config: OtherConfig): string | null {
  const text = rawText.trim();
  if (!text) return config.errorMessage;
  if (text.length > 2000) return config.invalidMessage;
  switch (config.validation) {
    case "any":
      return null;
    case "text_length":
      return text.length >= config.minLength && text.length <= config.maxLength
        ? null
        : config.invalidMessage;
    case "integer":
      return /^-?\d+$/.test(text) ? null : config.invalidMessage;
    case "decimal":
      return /^-?\d+([.,]\d+)?$/.test(text) ? null : config.invalidMessage;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? null : config.invalidMessage;
    case "date_us":
    case "date_intl": {
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
      if (!match) return config.invalidMessage;
      const [first, second, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
      const valid =
        config.validation === "date_us"
          ? isRealDate(second, first, year)
          : isRealDate(first, second, year);
      return valid ? null : config.invalidMessage;
    }
  }
}

/** A dropdown answer is a plain option value, or {choice, other} when it carries free text. */
export type ChoiceAnswerParts = { choice: string; other: string };

export function readChoiceAnswer(value: unknown): ChoiceAnswerParts {
  if (typeof value === "string") return { choice: value, other: "" };
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return {
      choice: typeof record.choice === "string" ? record.choice : "",
      other: typeof record.other === "string" ? record.other : "",
    };
  }
  return { choice: "", other: "" };
}

export function isChoiceWithOther(value: unknown): value is { choice: string; other: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "choice" in value &&
    "other" in value
  );
}

/** "Etiqueta: texto" for an answer that carries free text, or null for any other answer. */
export function formatChoiceWithOther(value: unknown, labels: Map<string, string>): string | null {
  if (!isChoiceWithOther(value)) return null;
  const { choice, other } = readChoiceAnswer(value);
  const label = choice ? labels.get(choice) ?? choice : "";
  if (!other) return label;
  return label ? `${label}: ${other}` : other;
}

// ---------------------------------------------------------------------------
// Option ordering (random / alphabetical / flip)
// ---------------------------------------------------------------------------

export type OptionOrderMode = "random" | "alphabetical" | "flip";

function seededShuffle<T>(items: T[], seed: string): T[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const j = hash % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Orders the options a respondent sees. «Otra» and «Ninguna» always stay at the end;
 * with `keepLast` the last regular option stays in place too. `seed` makes the random
 * and flip modes stable for one respondent but different between respondents.
 */
export function orderOptions(
  options: QuestionOption[],
  settings: { randomize: boolean; mode: string | null; keepLast: boolean; seed: string },
): QuestionOption[] {
  if (!settings.randomize) return options;
  const specials = options.filter((o) => o.kind === "other" || o.kind === "none");
  const regular = options.filter((o) => o.kind !== "other" && o.kind !== "none");
  const pinned = settings.keepLast && regular.length > 1 ? regular[regular.length - 1] : undefined;
  const movable = pinned ? regular.slice(0, -1) : regular;

  let ordered: QuestionOption[];
  if (settings.mode === "alphabetical") {
    ordered = [...movable].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  } else if (settings.mode === "flip") {
    // Each respondent sees the list either as written or reversed.
    ordered = seededShuffle([0, 1], settings.seed)[0] === 0 ? movable : [...movable].reverse();
  } else {
    ordered = seededShuffle(movable, settings.seed);
  }
  return [...ordered, ...(pinned ? [pinned] : []), ...specials];
}
