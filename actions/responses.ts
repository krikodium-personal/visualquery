"use server";

import { prisma } from "@/lib/prisma";
import type { AnswerValue } from "@/lib/flow-engine";
import {
  countAnsweredMatrixRows,
  parseOptions,
  readChoiceAnswer,
  readOtherConfig,
  validateOtherText,
} from "@/lib/question-options";

async function assertSurveyAcceptingResponses(surveyId: string) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, status: "published" },
    select: {
      id: true,
      responseLimit: true,
      cutoffAt: true,
      _count: { select: { responses: true } },
    },
  });
  if (!survey) throw new Error("Encuesta no disponible");

  if (survey.cutoffAt && survey.cutoffAt.getTime() <= Date.now()) {
    throw new Error("Esta encuesta ya alcanzó su fecha de cierre");
  }
  if (survey.responseLimit !== null && survey._count.responses >= survey.responseLimit) {
    throw new Error("Esta encuesta alcanzó el límite de respuestas");
  }

  return survey;
}

export async function startResponse(surveyId: string): Promise<string> {
  await assertSurveyAcceptingResponses(surveyId);
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
      options: true,
    },
  });
  if (!question) throw new Error("Pregunta no válida");

  if (
    question.type === "dropdown_matrix" &&
    (question.minSelections !== null || question.maxSelections !== null) &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    const answered = countAnsweredMatrixRows(
      parseOptions(question.options),
      value as Record<string, unknown>,
    );
    if (
      (question.minSelections !== null && answered < question.minSelections) ||
      (question.maxSelections !== null && answered > question.maxSelections)
    ) {
      throw new Error(
        question.selectionErrorMessage || "La cantidad de filas respondidas no es válida",
      );
    }
  }

  if (question.type === "dropdown") {
    const options = parseOptions(question.options);
    const otherOption = options.find((option) => option.kind === "other");
    const { choice, other } = readChoiceAnswer(value);
    if (choice && !options.some((option) => option.value === choice)) {
      throw new Error("La opción elegida no es válida");
    }
    if (otherOption) {
      const config = readOtherConfig(otherOption);
      const needsText =
        (config.mode === "option" && choice === otherOption.value) || other.trim() !== "";
      if (needsText) {
        const problem = validateOtherText(other, config);
        if (problem) throw new Error(problem);
      }
    }
  }

  if (question.type === "multi_choice" || (question.type === "image_choice" && Array.isArray(value))) {
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
