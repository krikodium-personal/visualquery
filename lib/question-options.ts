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
