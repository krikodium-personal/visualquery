"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireSurveyOwnership(surveyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true, slug: true },
  });
  if (!survey) throw new Error("Encuesta no encontrada");
  return survey;
}

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Usá un color en formato #rrggbb");

/** Empty text inputs come through as "" — store them as null instead. */
const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .nullable();

const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/;

/** Accepts either a regular image URL or an uploaded image encoded as data. */
const optionalImageSource = (label: string) =>
  z
    .string()
    .trim()
    .max(2_800_000, `${label} supera el tamaño máximo permitido`)
    .refine(
      (value) =>
        value === "" ||
        (/^https?:\/\//.test(value) && value.length <= 2000) ||
        DATA_IMAGE_PATTERN.test(value),
      `${label} tiene que ser una imagen subida o una URL http(s)`,
    )
    .transform((v) => (v === "" ? null : v))
    .nullable();

const designSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  description: optionalText,
  themePreset: z.enum(["modern", "classic", "futuristic", "minimal", "editorial", "warm", "vibrant"]),
  themeColor: hexColor,
  backgroundColor: hexColor,
  colorMode: z.enum(["light", "dark"]),
  backgroundImageUrl: optionalImageSource("La imagen de fondo"),
  backgroundImageScope: z.enum(["cover", "all"]),
  fontFamily: z.enum([
    "sans",
    "system",
    "helvetica",
    "arial",
    "verdana",
    "tahoma",
    "trebuchet",
    "georgia",
    "times",
    "garamond",
    "courier",
    "lucida-console",
    "serif",
    "mono",
  ]),
  buttonShape: z.enum(["rounded", "pill", "square"]),
  surfaceStyle: z.enum(["solid", "transparent", "blur", "glass"]),
  logoUrl: optionalImageSource("El logo"),
  logoSize: z.coerce.number().int().min(40).max(240),
  logoPosition: z.enum([
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]),
  showProgress: z.boolean(),
  progressDisplay: z.enum(["percentage", "questions"]),
  welcomeEnabled: z.boolean(),
  welcomeTitle: optionalText,
  welcomeText: optionalText,
  welcomeButtonLabel: optionalText,
  thankYouTitle: optionalText,
  thankYouText: optionalText,
});

export type SurveyDesignInput = z.input<typeof designSchema>;

export async function updateSurveyDesign(surveyId: string, input: SurveyDesignInput) {
  const survey = await requireSurveyOwnership(surveyId);
  const data = designSchema.parse(input);

  await prisma.survey.update({ where: { id: survey.id }, data });

  revalidatePath(`/surveys/${surveyId}/design`);
  revalidatePath(`/surveys/${surveyId}/questions`);
  revalidatePath(`/s/${survey.slug}`);
  revalidatePath("/dashboard");
}
