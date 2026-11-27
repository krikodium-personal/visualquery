"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import {
  collectorNameSchema,
  collectorOptionsSchema,
  slugSchema,
  type CollectorOptionsInput,
} from "@/lib/share-options";
import { slugify } from "@/lib/slug";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user.id;
}

/** The collector, only if it belongs to one of the signed-in user's surveys. */
async function ownCollector(collectorId: string) {
  const ownerId = await requireUserId();
  return prisma.collector.findFirst({
    where: { id: collectorId, survey: { ownerId } },
    include: { survey: { select: { id: true, title: true } } },
  });
}

function refresh(surveyId: string, slug: string) {
  revalidatePath(`/surveys/${surveyId}/publish`);
  revalidatePath(`/s/${slug}`);
}

export async function createCollector(surveyId: string, name: string): Promise<ActionResult> {
  const ownerId = await requireUserId();
  const parsedName = collectorNameSchema.safeParse(name);
  if (!parsedName.success) return { error: parsedName.error.issues[0].message };

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId },
    select: { title: true },
  });
  if (!survey) return { error: "Encuesta no encontrada" };

  const collector = await prisma.collector.create({
    data: { surveyId, name: parsedName.data, slug: slugify(survey.title) },
  });
  revalidatePath(`/surveys/${surveyId}/publish`);
  return { id: collector.id };
}

export async function renameCollector(collectorId: string, name: string): Promise<ActionResult> {
  const parsedName = collectorNameSchema.safeParse(name);
  if (!parsedName.success) return { error: parsedName.error.issues[0].message };
  const collector = await ownCollector(collectorId);
  if (!collector) return { error: "Recopilador no encontrado" };

  await prisma.collector.update({ where: { id: collectorId }, data: { name: parsedName.data } });
  refresh(collector.surveyId, collector.slug);
  return {};
}

export async function setCollectorOpen(collectorId: string, open: boolean): Promise<ActionResult> {
  const collector = await ownCollector(collectorId);
  if (!collector) return { error: "Recopilador no encontrado" };

  await prisma.collector.update({
    where: { id: collectorId },
    data: { status: open ? "open" : "closed" },
  });
  refresh(collector.surveyId, collector.slug);
  return {};
}

/** Copies the settings (not the responses) into a new collector with its own link. */
export async function duplicateCollector(collectorId: string): Promise<ActionResult> {
  const collector = await ownCollector(collectorId);
  if (!collector) return { error: "Recopilador no encontrado" };

  const copy = await prisma.collector.create({
    data: {
      surveyId: collector.surveyId,
      name: `${collector.name} (copia)`.slice(0, 80),
      type: collector.type,
      slug: slugify(collector.survey.title),
      status: "open",
      accessPassword: collector.accessPassword,
      responseLimit: collector.responseLimit,
      cutoffAt: collector.cutoffAt,
      endRedirectUrl: collector.endRedirectUrl,
      disqualifyMessage: collector.disqualifyMessage,
      disqualifyRedirectUrl: collector.disqualifyRedirectUrl,
    },
  });
  revalidatePath(`/surveys/${collector.surveyId}/publish`);
  return { id: copy.id };
}

/** Deleting keeps the responses collected through it (they just lose their collector). */
export async function deleteCollector(collectorId: string): Promise<ActionResult> {
  const collector = await ownCollector(collectorId);
  if (!collector) return { error: "Recopilador no encontrado" };

  const total = await prisma.collector.count({ where: { surveyId: collector.surveyId } });
  if (total <= 1) return { error: "La encuesta necesita al menos un recopilador" };

  await prisma.collector.delete({ where: { id: collectorId } });
  refresh(collector.surveyId, collector.slug);
  return {};
}

/** Lets the owner pick the end of the collector's public link (/s/<slug>). */
export async function updateCollectorSlug(collectorId: string, slug: string): Promise<ActionResult> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const collector = await ownCollector(collectorId);
  if (!collector) return { error: "Recopilador no encontrado" };
  if (collector.slug === parsed.data) return {};

  const taken = await prisma.collector.findUnique({
    where: { slug: parsed.data },
    select: { id: true },
  });
  if (taken) return { error: "Ese final de link ya está en uso, probá con otro" };

  await prisma.collector.update({ where: { id: collectorId }, data: { slug: parsed.data } });
  refresh(collector.surveyId, collector.slug);
  revalidatePath(`/s/${parsed.data}`);
  return {};
}

/** Password, response cap, cutoff date, redirect after answering and disqualification screen. */
export async function updateCollectorOptions(
  collectorId: string,
  input: CollectorOptionsInput,
): Promise<ActionResult> {
  const parsed = collectorOptionsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const collector = await ownCollector(collectorId);
  if (!collector) return { error: "Recopilador no encontrado" };

  await prisma.collector.update({
    where: { id: collectorId },
    data: {
      ...parsed.data,
      cutoffAt: parsed.data.cutoffAt ? new Date(parsed.data.cutoffAt) : null,
    },
  });
  refresh(collector.surveyId, collector.slug);
  return {};
}
