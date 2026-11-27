import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDraftSurvey } from "@/lib/ai/create-survey";
import {
  AiInvalidError,
  AiNotConfiguredError,
  AiRefusedError,
  generateAiSurvey,
} from "@/lib/ai/generate-survey";

/** Generations per user per rolling 24 hours (override with AI_DAILY_LIMIT). */
const DEFAULT_DAILY_LIMIT = 10;

const bodySchema = z.object({
  description: z.string().trim().min(15, "Describe un poco más la encuesta que necesitas.").max(2500, "La descripción es demasiado larga."),
  language: z.enum(["auto", "es", "en"]).default("auto"),
  questionCount: z.number().int().min(3).max(30).default(10),
});

function errorMessage(error: unknown): string {
  if (error instanceof AiNotConfiguredError) {
    return "La generación con IA todavía no está configurada en este entorno.";
  }
  if (error instanceof AiRefusedError) {
    return "El modelo no pudo generar esta encuesta. Prueba con otra descripción.";
  }
  if (error instanceof AiInvalidError) {
    return "No logré armar una encuesta consistente con esa descripción. Prueba con más detalle o con menos preguntas.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "El servicio de IA está muy ocupado. Inténtalo de nuevo en unos minutos.";
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return "La clave del servicio de IA no es válida. Avisa al administrador.";
  }
  if (error instanceof Anthropic.APIError) {
    return "El servicio de IA no respondió bien. Inténtalo de nuevo.";
  }
  return "No se pudo crear la encuesta. Inténtalo de nuevo.";
}

/**
 * Generates a draft survey from a description. The response is a stream of JSON lines so the
 * connection stays alive during the (long) model call: {type:"progress"} heartbeats, then one
 * {type:"done", surveyId} or {type:"error", message}.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  // Nothing to count (or charge) when the service is not set up.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: errorMessage(new AiNotConfiguredError("missing key")) }, { status: 503 });
  }

  const userId = session.user.id;
  const limit = Number(process.env.AI_DAILY_LIMIT) || DEFAULT_DAILY_LIMIT;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiGeneration.count({ where: { userId, createdAt: { gte: since } } });
  if (used >= limit) {
    return Response.json(
      { error: `Llegaste al límite de ${limit} generaciones por día. Vuelve a intentarlo mañana.` },
      { status: 429 },
    );
  }

  const record = await prisma.aiGeneration.create({ data: { userId } });
  const encoder = new TextEncoder();
  const line = (value: object) => encoder.encode(`${JSON.stringify(value)}\n`);

  const stream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => controller.enqueue(line({ type: "progress" })), 8000);
      try {
        controller.enqueue(line({ type: "progress" }));
        const result = await generateAiSurvey(parsed.data);
        const surveyId = await createDraftSurvey(userId, result.survey);
        await prisma.aiGeneration.update({
          where: { id: record.id },
          data: {
            status: "succeeded",
            surveyId,
            model: result.model,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
          },
        });
        controller.enqueue(line({ type: "done", surveyId }));
      } catch (error) {
        console.error("AI survey generation failed", error);
        await prisma.aiGeneration.update({ where: { id: record.id }, data: { status: "failed" } }).catch(() => undefined);
        controller.enqueue(line({ type: "error", message: errorMessage(error) }));
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
