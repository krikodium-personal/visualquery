"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAnalysisViews, type AnalysisView } from "@/lib/analysis-views";

const filterRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    kind: z.literal("question_answer"),
    questionId: z.string(),
    values: z.array(z.string()),
  }),
  z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    kind: z.literal("completeness"),
    completeness: z.enum(["completed", "partial"]),
  }),
  z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    kind: z.literal("period"),
    dateFrom: z.string(),
    dateTo: z.string(),
  }),
]);

const analysisViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  rules: z.object({
    filters: z.array(filterRuleSchema),
    compares: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        enabled: z.boolean(),
        questionId: z.string(),
        values: z.array(z.string()),
      }),
    ),
    shows: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        enabled: z.boolean(),
        questionIds: z.array(z.string()),
      }),
    ),
  }),
  createdAt: z.string(),
});

export async function saveAnalysisViews(surveyId: string, views: AnalysisView[]) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const parsed = z.array(analysisViewSchema).max(40).parse(views);

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true },
  });
  if (!survey) throw new Error("Encuesta no encontrada");

  await prisma.survey.update({
    where: { id: surveyId },
    data: { analysisViews: parsed },
  });

  revalidatePath(`/surveys/${surveyId}/results`);
}

export async function loadAnalysisViews(surveyId: string): Promise<AnalysisView[]> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId: session.user.id },
    select: { analysisViews: true },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  return parseAnalysisViews(survey.analysisViews);
}
