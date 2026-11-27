"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";

async function ownedSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.survey.findFirst({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true },
  });
}

/** Deletes the given responses (and their answers) of a survey the user owns. */
export async function deleteResponses(
  surveyId: string,
  responseIds: string[],
): Promise<ActionResult & { deleted?: number }> {
  if (responseIds.length === 0) return { error: "No hay respuestas para borrar" };
  if (!(await ownedSurvey(surveyId))) return { error: "Encuesta no encontrada" };

  const result = await prisma.response.deleteMany({
    where: { surveyId, id: { in: responseIds } },
  });
  revalidatePath(`/surveys/${surveyId}/results`);
  return { deleted: result.count };
}
