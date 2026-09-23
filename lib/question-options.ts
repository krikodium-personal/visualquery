import { z } from "zod";

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  imageUrl: z.string().optional(),
  kind: z.enum(["row", "choice", "scale_left", "scale_center", "scale_right"]).optional(),
  isCorrect: z.boolean().optional(),
  points: z.number().int().nonnegative().optional(),
});
const optionsSchema = z.array(optionSchema);

export type QuestionOption = z.infer<typeof optionSchema>;

export function parseOptions(options: unknown): QuestionOption[] {
  const parsed = optionsSchema.safeParse(options);
  return parsed.success ? parsed.data : [];
}

export function optionPoints(option: QuestionOption): number {
  if (!option.isCorrect) return 0;
  const points = option.points ?? 0;
  return Number.isFinite(points) && points > 0 ? Math.floor(points) : 0;
}
