"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAnalysisViews, type AnalysisView } from "@/lib/analysis-views";

const questionFilterSchema = z.object({
  questionId: z.string(),
  values: z.array(z.string()),
});

const filterStateSchema = z.object({
  completeness: z.enum(["all", "completed", "partial"]),
  dateFrom: z.string(),
  dateTo: z.string(),
  questionFilters: z.array(questionFilterSchema),
});

const compareGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  filters: filterStateSchema,
});

const analysisViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  filters: filterStateSchema,
  compareGroups: z.array(compareGroupSchema).max(6),
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
