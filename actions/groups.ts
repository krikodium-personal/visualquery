"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { nextGroupColor } from "@/lib/question-groups";

async function ownedSurveyId(surveyId: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true },
  });
  return survey?.id ?? null;
}

const nameSchema = z.string().trim().min(1, "Ingresá un nombre para el grupo").max(60, "El nombre es demasiado largo");

/** Groups left without cards are removed. */
async function dropEmptyGroups(surveyId: string) {
  await prisma.questionGroup.deleteMany({ where: { surveyId, questions: { none: {} } } });
}

async function allQuestionsBelong(surveyId: string, questionIds: string[]): Promise<boolean> {
  const found = await prisma.question.count({ where: { surveyId, id: { in: questionIds } } });
  return found === new Set(questionIds).size;
}

/** Creates a group with the given cards (a card can only be in one group, so it moves). */
export async function createQuestionGroup(
  surveyId: string,
  name: string,
  questionIds: string[],
): Promise<ActionResult> {
  if (!(await ownedSurveyId(surveyId))) return { error: "Encuesta no encontrada" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (questionIds.length === 0) return { error: "Seleccioná al menos una pregunta" };
  if (!(await allQuestionsBelong(surveyId, questionIds))) {
    return { error: "Guardá los cambios del canvas antes de agrupar" };
  }

  const existing = await prisma.questionGroup.findMany({ where: { surveyId }, select: { color: true } });
  const group = await prisma.questionGroup.create({
    data: { surveyId, name: parsed.data, color: nextGroupColor(existing) },
  });
  await prisma.question.updateMany({ where: { surveyId, id: { in: questionIds } }, data: { groupId: group.id } });
  await dropEmptyGroups(surveyId);
  return { id: group.id };
}

/** Puts cards into an existing group, or takes them out of any group when groupId is null. */
export async function setQuestionsGroup(
  surveyId: string,
  questionIds: string[],
  groupId: string | null,
): Promise<ActionResult> {
  if (!(await ownedSurveyId(surveyId))) return { error: "Encuesta no encontrada" };
  if (!(await allQuestionsBelong(surveyId, questionIds))) {
    return { error: "Guardá los cambios del canvas antes de agrupar" };
  }
  if (groupId) {
    const group = await prisma.questionGroup.findFirst({ where: { id: groupId, surveyId }, select: { id: true } });
    if (!group) return { error: "Grupo no encontrado" };
  }
  await prisma.question.updateMany({ where: { surveyId, id: { in: questionIds } }, data: { groupId } });
  await dropEmptyGroups(surveyId);
  return {};
}

export async function renameQuestionGroup(surveyId: string, id: string, name: string): Promise<ActionResult> {
  if (!(await ownedSurveyId(surveyId))) return { error: "Encuesta no encontrada" };
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await prisma.questionGroup.updateMany({ where: { id, surveyId }, data: { name: parsed.data } });
  if (result.count === 0) return { error: "Grupo no encontrado" };
  return {};
}

/** Removes the group box only; its questions stay where they are. */
export async function deleteQuestionGroup(surveyId: string, id: string): Promise<ActionResult> {
  if (!(await ownedSurveyId(surveyId))) return { error: "Encuesta no encontrada" };
  await prisma.questionGroup.deleteMany({ where: { id, surveyId } });
  return {};
}
