"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";

const optionsSchema = z.object({
  showProgress: z.boolean(),
  progressDisplay: z.enum(["percentage", "questions", "both", "bar"]),
  progressPosition: z.enum(["top", "bottom"]),
  showTitle: z.boolean(),
  showQuestionNumbers: z.boolean(),
  showRequiredAsterisk: z.boolean(),
});

export type SurveyOptionsInput = z.infer<typeof optionsSchema>;

/** Saves the editor's «Opciones» panel (progress bar, title, numbering, asterisks). */
export async function updateSurveyOptions(
  surveyId: string,
  input: SurveyOptionsInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado" };
  const parsed = optionsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await prisma.survey.updateMany({
    where: { id: surveyId, ownerId: session.user.id },
    data: parsed.data,
  });
  if (result.count === 0) return { error: "Encuesta no encontrada" };

  const collectors = await prisma.collector.findMany({ where: { surveyId }, select: { slug: true } });
  for (const collector of collectors) revalidatePath(`/s/${collector.slug}`);
  return {};
}
