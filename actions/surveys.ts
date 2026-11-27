"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sharingOptionsSchema, type SharingOptionsInput } from "@/lib/share-options";
import { slugify } from "@/lib/slug";
import type { ActionResult } from "@/lib/action-result";
import {
  customVariableSchema,
  parseCustomVariables,
  MAX_CUSTOM_VARIABLES,
  RESERVED_VARIABLE_NAMES,
  type CustomVariable,
} from "@/lib/custom-variables";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user.id;
}

/** Public pages of every collector of a survey. */
async function revalidateCollectorPages(surveyId: string) {
  const collectors = await prisma.collector.findMany({ where: { surveyId }, select: { slug: true } });
  for (const collector of collectors) revalidatePath(`/s/${collector.slug}`);
}

const createSurveySchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
});

export async function createSurvey(_prevState: { error?: string } | undefined, formData: FormData) {
  const ownerId = await requireUserId();
  const parsed = createSurveySchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const slug = slugify(parsed.data.title);
  const survey = await prisma.survey.create({
    data: {
      ownerId,
      title: parsed.data.title,
      slug,
      collectors: { create: { name: "Enlace web 1", slug } },
    },
  });

  redirect(`/surveys/${survey.id}/design`);
}

export async function deleteSurvey(surveyId: string) {
  const ownerId = await requireUserId();
  const result = await prisma.survey.deleteMany({ where: { id: surveyId, ownerId } });
  if (result.count === 0) throw new Error("Encuesta no encontrada");
  revalidatePath("/dashboard");
}

export async function togglePublish(surveyId: string) {
  const ownerId = await requireUserId();
  const survey = await prisma.survey.findFirst({ where: { id: surveyId, ownerId } });
  if (!survey) throw new Error("Encuesta no encontrada");

  await setSurveyStatus(surveyId, survey.status === "published" ? "closed" : "published");
}

export async function setSurveyStatus(surveyId: string, status: "draft" | "published" | "closed") {
  const ownerId = await requireUserId();
  const next = z.enum(["draft", "published", "closed"]).parse(status);
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    select: { _count: { select: { questions: true } } },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  if (next === "published" && survey._count.questions === 0) {
    throw new Error("Agregá al menos una pregunta antes de abrir la encuesta");
  }
  await prisma.survey.update({ where: { id: surveyId, ownerId }, data: { status: next } });
  revalidatePath("/dashboard");
  revalidatePath(`/surveys/${surveyId}`, "layout");
  await revalidateCollectorPages(surveyId);
}

export async function renameSurvey(surveyId: string, title: string) {
  const ownerId = await requireUserId();
  if (!title.trim()) return;
  await prisma.survey.updateMany({
    where: { id: surveyId, ownerId },
    data: { title: title.trim() },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/surveys/${surveyId}/questions`);
}

/** Link preview (title, description, image) shared by every collector of the survey. */
export async function updateSharingOptions(
  surveyId: string,
  input: SharingOptionsInput,
): Promise<ActionResult> {
  const ownerId = await requireUserId();
  const result = sharingOptionsSchema.safeParse(input);
  if (!result.success) return { error: result.error.issues[0].message };

  const survey = await prisma.survey.findFirst({ where: { id: surveyId, ownerId }, select: { id: true } });
  if (!survey) return { error: "Encuesta no encontrada" };

  await prisma.survey.update({ where: { id: surveyId, ownerId }, data: result.data });

  revalidatePath(`/surveys/${surveyId}/publish`);
  await revalidateCollectorPages(surveyId);
  return {};
}

/** URL parameters captured with each response (SurveyMonkey "Variables personalizadas"). */
export async function updateCustomVariables(
  surveyId: string,
  variables: CustomVariable[],
): Promise<ActionResult> {
  const ownerId = await requireUserId();
  const result = z
    .array(customVariableSchema)
    .max(MAX_CUSTOM_VARIABLES, `Hasta ${MAX_CUSTOM_VARIABLES} variables`)
    .safeParse(variables);
  if (!result.success) return { error: result.error.issues[0].message };
  const parsed = result.data;

  const names = parsed.map((variable) => variable.name.toLowerCase());
  if (new Set(names).size !== names.length) return { error: "Hay nombres de variable repetidos" };
  if (names.some((name) => RESERVED_VARIABLE_NAMES.includes(name))) {
    return { error: `«${RESERVED_VARIABLE_NAMES.join(", ")}» ya lo usa el link público` };
  }

  const survey = await prisma.survey.findFirst({ where: { id: surveyId, ownerId }, select: { id: true } });
  if (!survey) return { error: "Encuesta no encontrada" };

  await prisma.survey.update({
    where: { id: surveyId, ownerId },
    data: {
      customVariables: parsed.map((variable) => ({
        name: variable.name,
        label: variable.label || undefined,
      })),
    },
  });

  revalidatePath(`/surveys/${surveyId}/publish`);
  revalidatePath(`/surveys/${surveyId}/results`);
  await revalidateCollectorPages(surveyId);
  return {};
}

/** SurveyMonkey-style “Hacer una copia”: clone survey + questions + edges (no responses). */
export async function duplicateSurvey(surveyId: string): Promise<string> {
  const ownerId = await requireUserId();
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    include: {
      questions: { orderBy: { createdAt: "asc" } },
      edges: true,
    },
  });
  if (!survey) throw new Error("Encuesta no encontrada");

  const {
    id: _id,
    ownerId: _ownerId,
    slug: _slug,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    questions,
    edges,
    ...design
  } = survey;

  const copySlug = slugify(survey.title);
  const copy = await prisma.survey.create({
    data: {
      ...design,
      ownerId,
      title: `${survey.title} (copia)`,
      slug: copySlug,
      status: "draft",
      accessPassword: null,
      responseLimit: null,
      cutoffAt: null,
      endRedirectUrl: null,
      disqualifyMessage: null,
      disqualifyRedirectUrl: null,
      analysisViews: [],
      collectors: { create: { name: "Enlace web 1", slug: copySlug } },
      customVariables: parseCustomVariables(survey.customVariables).map((variable) => ({
        name: variable.name,
        label: variable.label || undefined,
      })),
    },
  });

  const idMap = new Map<string, string>();
  for (const question of questions) {
    const created = await prisma.question.create({
      data: {
        surveyId: copy.id,
        type: question.type,
        title: question.title,
        options: question.options ?? undefined,
        positionX: question.positionX,
        positionY: question.positionY,
        isRoot: question.isRoot,
        required: question.required,
        scoringEnabled: question.scoringEnabled,
        minSelections: question.minSelections,
        maxSelections: question.maxSelections,
        selectionErrorMessage: question.selectionErrorMessage,
        requiredErrorMessage: question.requiredErrorMessage,
        description: question.description,
        randomizeOptions: question.randomizeOptions,
        orderMode: question.orderMode,
        keepLastOption: question.keepLastOption,
      },
    });
    idMap.set(question.id, created.id);
  }

  if (edges.length > 0) {
    await prisma.edge.createMany({
      data: edges.flatMap((edge) => {
        const sourceQuestionId = idMap.get(edge.sourceQuestionId);
        const targetQuestionId = idMap.get(edge.targetQuestionId);
        if (!sourceQuestionId || !targetQuestionId) return [];
        return [
          {
            surveyId: copy.id,
            sourceQuestionId,
            targetQuestionId,
            sourceOptionValue: edge.sourceOptionValue,
          },
        ];
      }),
    });
  }

  revalidatePath("/dashboard");
  return copy.id;
}
