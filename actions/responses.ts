"use server";

import { prisma } from "@/lib/prisma";
import type { AnswerValue } from "@/lib/flow-engine";

export async function startResponse(surveyId: string): Promise<string> {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, status: "published" },
    select: { id: true },
  });
  if (!survey) throw new Error("Encuesta no disponible");

  const response = await prisma.response.create({ data: { surveyId } });
  return response.id;
}

export async function submitAnswer(
  responseId: string,
  questionId: string,
  value: AnswerValue,
) {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: { surveyId: true, completedAt: true, survey: { select: { status: true } } },
  });
  if (!response || response.completedAt) throw new Error("Respuesta no válida");
  if (response.survey.status !== "published") throw new Error("La encuesta ya no acepta respuestas");

  const question = await prisma.question.findFirst({
    where: { id: questionId, surveyId: response.surveyId },
    select: {
      id: true,
      type: true,
      minSelections: true,
      maxSelections: true,
      selectionErrorMessage: true,
    },
  });
  if (!question) throw new Error("Pregunta no válida");

  if (question.type === "multi_choice") {
    const selections = Array.isArray(value) ? [...new Set(value.map(String))] : [];
    const belowMinimum =
      question.minSelections !== null && selections.length < question.minSelections;
    const aboveMaximum =
      question.maxSelections !== null && selections.length > question.maxSelections;
    if (belowMinimum || aboveMaximum) {
      throw new Error(
        question.selectionErrorMessage || "La cantidad de opciones seleccionadas no es válida",
      );
    }
  }

  await prisma.answer.upsert({
    where: { responseId_questionId: { responseId, questionId } },
    create: { responseId, questionId, value },
    update: { value },
  });
}

export async function completeResponse(responseId: string) {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: { id: true, survey: { select: { status: true } } },
  });
  if (!response) return;
  if (response.survey.status !== "published") throw new Error("La encuesta ya no acepta respuestas");

  await prisma.response.update({
    where: { id: responseId },
    data: { completedAt: new Date() },
  });
}
