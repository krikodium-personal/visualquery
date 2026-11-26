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
    ])
    .optional(),
  // Dropdown matrix: the column (menu) a "choice" option belongs to. Absent = shared by all.
  columnValue: z.string().optional(),
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
