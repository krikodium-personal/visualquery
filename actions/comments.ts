"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { MAX_COMMENT_LENGTH, MAX_COMMENTS_PER_SURVEY, type CommentItem } from "@/lib/comments";

const bodySchema = z.string().trim().min(1, "Escribí un comentario").max(MAX_COMMENT_LENGTH, "El comentario es demasiado largo");

async function ownedSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true },
  });
  return survey ? { userId: session.user.id } : null;
}

function toItem(row: {
  id: string;
  questionId: string | null;
  parentId: string | null;
  authorId: string;
  body: string;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string | null; email: string };
}): CommentItem {
  return {
    id: row.id,
    questionId: row.questionId,
    parentId: row.parentId,
    authorId: row.authorId,
    authorName: row.author.name || row.author.email,
    body: row.body,
    resolved: row.resolvedAt !== null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const include = { author: { select: { name: true, email: true } } } as const;

export async function addComment(
  surveyId: string,
  input: { questionId: string | null; body: string; parentId?: string },
): Promise<ActionResult & { comment?: CommentItem }> {
  const owner = await ownedSurvey(surveyId);
  if (!owner) return { error: "Encuesta no encontrada" };
  const body = bodySchema.safeParse(input.body);
  if (!body.success) return { error: body.error.issues[0].message };

  const total = await prisma.surveyComment.count({ where: { surveyId } });
  if (total >= MAX_COMMENTS_PER_SURVEY) {
    return { error: `No puedes publicar más de ${MAX_COMMENTS_PER_SURVEY} comentarios en una encuesta.` };
  }

  let questionId = input.questionId;
  if (input.parentId) {
    const parent = await prisma.surveyComment.findFirst({ where: { id: input.parentId, surveyId, parentId: null } });
    if (!parent) return { error: "Comentario no encontrado" };
    questionId = parent.questionId; // replies live with their thread
  } else if (questionId) {
    const exists = await prisma.question.findFirst({ where: { id: questionId, surveyId }, select: { id: true } });
    if (!exists) return { error: "Pregunta no encontrada" };
  }

  const row = await prisma.surveyComment.create({
    data: { surveyId, questionId, authorId: owner.userId, parentId: input.parentId ?? null, body: body.data },
    include,
  });
  return { comment: toItem(row) };
}

export async function editComment(surveyId: string, id: string, body: string): Promise<ActionResult & { comment?: CommentItem }> {
  const owner = await ownedSurvey(surveyId);
  if (!owner) return { error: "Encuesta no encontrada" };
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const mine = await prisma.surveyComment.findFirst({ where: { id, surveyId, authorId: owner.userId } });
  if (!mine) return { error: "Solo podés editar tus comentarios" };
  const row = await prisma.surveyComment.update({ where: { id }, data: { body: parsed.data }, include });
  return { comment: toItem(row) };
}

/** Deletes the comment (and its replies). */
export async function deleteComment(surveyId: string, id: string): Promise<ActionResult> {
  const owner = await ownedSurvey(surveyId);
  if (!owner) return { error: "Encuesta no encontrada" };
  await prisma.surveyComment.deleteMany({ where: { id, surveyId } });
  return {};
}

export async function setCommentResolved(
  surveyId: string,
  id: string,
  resolved: boolean,
): Promise<ActionResult & { comment?: CommentItem }> {
  const owner = await ownedSurvey(surveyId);
  if (!owner) return { error: "Encuesta no encontrada" };
  const existing = await prisma.surveyComment.findFirst({ where: { id, surveyId, parentId: null } });
  if (!existing) return { error: "Comentario no encontrado" };
  const row = await prisma.surveyComment.update({
    where: { id },
    // Keep updatedAt as is: resolving is not an edit of the text.
    data: { resolvedAt: resolved ? new Date() : null, updatedAt: existing.updatedAt },
    include,
  });
  return { comment: toItem(row) };
}
