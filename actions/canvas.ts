"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { QUESTION_TYPE_VALUES } from "@/lib/question-types";

async function requireSurveyOwnership(surveyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId: session.user.id },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  return survey;
}

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  imageUrl: z.string().url().optional(),
  kind: z.enum(["row", "choice", "scale_left", "scale_center", "scale_right"]).optional(),
});

const questionPayloadSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  type: z.enum(QUESTION_TYPE_VALUES),
  options: z.array(optionSchema).optional(),
  positionX: z.number(),
  positionY: z.number(),
  isRoot: z.boolean(),
  required: z.boolean(),
  minSelections: z.number().int().positive().nullable(),
  maxSelections: z.number().int().positive().nullable(),
  selectionErrorMessage: z.string().max(500).nullable(),
}).refine(
  (question) =>
    question.type === "multi_choice" ||
    (question.minSelections === null &&
      question.maxSelections === null &&
      question.selectionErrorMessage === null),
  { message: "Los límites de selección sólo se admiten en preguntas con casillas" },
).refine(
  (question) =>
    question.minSelections === null ||
    question.maxSelections === null ||
    question.minSelections <= question.maxSelections,
  { message: "El mínimo de selecciones no puede superar el máximo" },
).refine(
  (question) =>
    question.maxSelections === null || question.maxSelections <= (question.options?.length ?? 0),
  { message: "El máximo de selecciones no puede superar la cantidad de opciones" },
);

const edgePayloadSchema = z.object({
  sourceQuestionId: z.string(),
  targetQuestionId: z.string(),
  sourceOptionValue: z.string().nullable(),
});

const applyPayloadSchema = z.object({
  questions: z.array(questionPayloadSchema),
  edges: z.array(edgePayloadSchema),
});

/**
 * Persists the whole local canvas graph in one shot (the editor only calls
 * this on an explicit "Aplicar cambios" click, not on every interaction).
 * Questions are diffed against the DB (create/update/delete); edges are
 * simply replaced wholesale since the graph is always small.
 */
export async function applyCanvasChanges(
  surveyId: string,
  payload: z.infer<typeof applyPayloadSchema>,
): Promise<{ questionIdMap: Record<string, string> }> {
  await requireSurveyOwnership(surveyId);
  const { questions, edges } = applyPayloadSchema.parse(payload);

  const existing = await prisma.question.findMany({
    where: { surveyId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((q) => q.id));
  const incomingIds = new Set(questions.map((q) => q.id));

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  const toCreate = questions.filter((q) => !existingIds.has(q.id));
  const toUpdate = questions.filter((q) => existingIds.has(q.id));

  const questionIdMap: Record<string, string> = {};

  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.question.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const q of toUpdate) {
      await tx.question.update({
        where: { id: q.id },
        data: {
          title: q.title,
          type: q.type,
          options: q.options ?? undefined,
          positionX: q.positionX,
          positionY: q.positionY,
          required: q.required,
          minSelections: q.minSelections,
          maxSelections: q.maxSelections,
          selectionErrorMessage: q.selectionErrorMessage,
        },
      });
    }

    for (const q of toCreate) {
      const created = await tx.question.create({
        data: {
          surveyId,
          title: q.title,
          type: q.type,
          options: q.options ?? undefined,
          positionX: q.positionX,
          positionY: q.positionY,
          isRoot: q.isRoot,
          required: q.required,
          minSelections: q.minSelections,
          maxSelections: q.maxSelections,
          selectionErrorMessage: q.selectionErrorMessage,
        },
      });
      questionIdMap[q.id] = created.id;
    }

    await tx.edge.deleteMany({ where: { surveyId } });
    if (edges.length > 0) {
      await tx.edge.createMany({
        data: edges.map((e) => ({
          surveyId,
          sourceQuestionId: questionIdMap[e.sourceQuestionId] ?? e.sourceQuestionId,
          targetQuestionId: questionIdMap[e.targetQuestionId] ?? e.targetQuestionId,
          sourceOptionValue: e.sourceOptionValue,
        })),
      });
    }
  });

  revalidatePath(`/surveys/${surveyId}/questions`);
  revalidatePath(`/surveys/${surveyId}/results`);
  revalidatePath("/dashboard");

  return { questionIdMap };
}
