"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  redirect(`/surveys/${survey.id}/questions`);
}

export async function deleteSurvey(surveyId: string) {
  const ownerId = await requireUserId();
  await prisma.survey.deleteMany({ where: { id: surveyId, ownerId } });
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
