"use server";

import { prisma } from "@/lib/prisma";
import { MAX_VARIABLE_VALUE_LENGTH, parseCustomVariables } from "@/lib/custom-variables";
import { answerMatchesOption, resolveAnswerAction, type AnswerValue } from "@/lib/flow-engine";
import { fullQuotaValues } from "@/lib/quotas";
import { notifyResponseCompleted } from "@/lib/notifications";
import { collectorClosedReason } from "@/lib/collectors";
import {
  countAnsweredMatrixRows,
  parseOptions,
  readChoiceAnswer,
  readOtherConfig,
  validateOtherText,
} from "@/lib/question-options";

async function assertCollectorAcceptingResponses(collectorId: string) {
  const collector = await prisma.collector.findUnique({
    where: { id: collectorId },
    select: {
      id: true,
      surveyId: true,
      status: true,
      cutoffAt: true,
      responseLimit: true,
      survey: { select: { status: true, customVariables: true } },
      _count: { select: { responses: true } },
    },
  });
  if (!collector || collector.survey.status !== "published") throw new Error("Encuesta no disponible");

  const closedReason = collectorClosedReason(collector, collector._count.responses);
  if (closedReason) throw new Error(closedReason);
  return collector;
}

export async function startResponse(
  collectorId: string,
  variables: Record<string, string> = {},
): Promise<string> {
  const collector = await assertCollectorAcceptingResponses(collectorId);
  // Only the variables the survey defines are stored, whatever the client sends.
  const definitions = parseCustomVariables(collector.survey.customVariables);
  const allowed = new Set(definitions.map((definition) => definition.name));
  const clean: Record<string, string> = {};
  for (const [name, value] of Object.entries(variables)) {
    if (allowed.has(name) && typeof value === "string" && value.trim()) {
      clean[name] = value.trim().slice(0, MAX_VARIABLE_VALUE_LENGTH);
    }
  }
  const response = await prisma.response.create({
    data: {
      surveyId: collector.surveyId,
      collectorId: collector.id,
      variables: Object.keys(clean).length > 0 ? clean : undefined,
    },
  });
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

  const questionOptions = parseOptions(question.options);
  if (questionOptions.some((option) => option.quota !== undefined)) {
    const full = await fullQuotaValues(question.id, questionOptions, responseId);
    const blocked = questionOptions.some(
      (option) => full.has(option.value) && answerMatchesOption(value, option.value),
    );
    if (blocked) {
      throw new Error("Esa opción ya alcanzó su cupo. Recargá la página y elegí otra.");
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
    select: {
      id: true,
      surveyId: true,
      collectorId: true,
      completedAt: true,
      survey: { select: { status: true } },
    },
  });
  if (!response) return;
  if (response.survey.status !== "published") throw new Error("La encuesta ya no acepta respuestas");
  if (response.completedAt) return; // already completed: don't count it twice

  await prisma.response.update({
    where: { id: responseId },
    data: { completedAt: new Date() },
  });
  await notifyResponseCompleted(response.surveyId, response.collectorId);
}

/**
 * Marks the respondent as disqualified. The client only asks for it; the server checks that
 * one of the saved answers really picked an option set to "Descalificar".
 */
export async function disqualifyResponse(responseId: string) {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    select: {
      surveyId: true,
      survey: { select: { status: true } },
      answers: { select: { questionId: true, value: true } },
    },
  });
  if (!response) return;
  if (response.survey.status !== "published") throw new Error("La encuesta ya no acepta respuestas");

  const questions = await prisma.question.findMany({
    where: { surveyId: response.surveyId },
    select: { id: true, options: true },
  });
  const optionsByQuestion = new Map(
    questions.map((question) => [question.id, parseOptions(question.options)]),
  );
  const earned = response.answers.some(
    (answer) =>
      resolveAnswerAction(optionsByQuestion.get(answer.questionId) ?? [], answer.value as AnswerValue) ===
      "disqualify",
  );
  if (!earned) throw new Error("Respuesta no válida");

  await prisma.response.update({
    where: { id: responseId },
    data: { completedAt: new Date(), disqualified: true },
  });
}
