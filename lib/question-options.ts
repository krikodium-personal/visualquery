import { z } from "zod";

const optionSchema = z.object({
  value: z.string(),
  label: z.string(),
  imageUrl: z.string().optional(),
  kind: z.enum(["row", "choice", "scale_left", "scale_center", "scale_right"]).optional(),
});
const optionsSchema = z.array(optionSchema);

export type QuestionOption = z.infer<typeof optionSchema>;

export function parseOptions(options: unknown): QuestionOption[] {
  const parsed = optionsSchema.safeParse(options);
  return parsed.success ? parsed.data : [];
}
