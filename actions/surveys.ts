"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sharingOptionsSchema, slugSchema, type SharingOptionsInput } from "@/lib/share-options";
import {
  customVariableSchema,
  parseCustomVariables,
  MAX_CUSTOM_VARIABLES,
  RESERVED_VARIABLE_NAMES,
  type CustomVariable,
} from "@/lib/custom-variables";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "encuesta"}-${suffix}`;
}

/** Server actions that can fail for user-fixable reasons return the message instead of throwing
 * (in production Next hides the text of thrown errors from the client). */
export type ActionResult = { error?: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user.id;
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

  const survey = await prisma.survey.create({
    data: {
      ownerId,
      title: parsed.data.title,
      slug: slugify(parsed.data.title),
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
    select: { slug: true, _count: { select: { questions: true } } },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  if (next === "published" && survey._count.questions === 0) {
    throw new Error("Agregá al menos una pregunta antes de abrir la encuesta");
  }
  await prisma.survey.update({ where: { id: surveyId, ownerId }, data: { status: next } });
  revalidatePath("/dashboard");
  revalidatePath(`/surveys/${surveyId}`, "layout");
  revalidatePath(`/s/${survey.slug}`);
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

const collectorOptionsSchema = z.object({
  accessPassword: z.string().max(200).nullable(),
  responseLimit: z.number().int().positive().max(1_000_000).nullable(),
  cutoffAt: z.string().datetime().nullable(),
});

/** SurveyMonkey-style web-link collector options. */
export async function updateCollectorOptions(
  surveyId: string,
  input: {
    accessPassword: string | null;
    responseLimit: number | null;
    cutoffAt: string | null;
  },
) {
  const ownerId = await requireUserId();
  const cutoffRaw = input.cutoffAt?.trim() || null;
  const parsed = collectorOptionsSchema.parse({
    accessPassword: input.accessPassword?.trim() ? input.accessPassword.trim() : null,
    responseLimit: input.responseLimit,
    cutoffAt: cutoffRaw,
  });

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    select: { slug: true },
  });
  if (!survey) throw new Error("Encuesta no encontrada");

  await prisma.survey.update({
    where: { id: surveyId, ownerId },
    data: {
      accessPassword: parsed.accessPassword,
      responseLimit: parsed.responseLimit,
      cutoffAt: parsed.cutoffAt ? new Date(parsed.cutoffAt) : null,
    },
  });

  revalidatePath(`/surveys/${surveyId}/publish`);
  revalidatePath(`/s/${survey.slug}`);
}

/** Lets the owner pick the end of the public link (/s/<slug>). */
export async function updateSlug(surveyId: string, slug: string): Promise<ActionResult> {
  const ownerId = await requireUserId();
  const result = slugSchema.safeParse(slug);
  if (!result.success) return { error: result.error.issues[0].message };
  const parsed = result.data;

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    select: { slug: true },
  });
  if (!survey) return { error: "Encuesta no encontrada" };
  if (survey.slug === parsed) return {};

  const taken = await prisma.survey.findUnique({ where: { slug: parsed }, select: { id: true } });
  if (taken) return { error: "Ese final de link ya está en uso, probá con otro" };

  await prisma.survey.update({ where: { id: surveyId, ownerId }, data: { slug: parsed } });

  revalidatePath(`/surveys/${surveyId}/publish`);
  revalidatePath(`/s/${survey.slug}`);
  revalidatePath(`/s/${parsed}`);
  return {};
}

/** Link preview, redirect after answering and disqualification screen. */
export async function updateSharingOptions(
  surveyId: string,
  input: SharingOptionsInput,
): Promise<ActionResult> {
  const ownerId = await requireUserId();
  const result = sharingOptionsSchema.safeParse(input);
  if (!result.success) return { error: result.error.issues[0].message };

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    select: { slug: true },
  });
  if (!survey) return { error: "Encuesta no encontrada" };

  await prisma.survey.update({ where: { id: surveyId, ownerId }, data: result.data });

  revalidatePath(`/surveys/${surveyId}/publish`);
  revalidatePath(`/s/${survey.slug}`);
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

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    select: { slug: true },
  });
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
  revalidatePath(`/s/${survey.slug}`);
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

  const copy = await prisma.survey.create({
    data: {
      ...design,
      ownerId,
      title: `${survey.title} (copia)`,
      slug: slugify(survey.title),
      status: "draft",
      accessPassword: null,
      responseLimit: null,
      cutoffAt: null,
      analysisViews: [],
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
