import { prisma } from "@/lib/prisma";

export const NOTIFICATION_WINDOW_DAYS = 30;

/** Calendar day (YYYY-MM-DD) in the owner's timezone, used to group "new responses" per day. */
function localDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

/**
 * Records a completed response for the survey owner: one "new_responses" notification per
 * survey per day with a running count, plus a once-only "limit_reached" when the cap is hit.
 * Never throws — a notification failing must not break the respondent's submission.
 */
export async function notifyResponseCompleted(surveyId: string) {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { ownerId: true, responseLimit: true, _count: { select: { responses: true } } },
    });
    if (!survey) return;

    const base = { userId: survey.ownerId, surveyId };
    await prisma.notification.upsert({
      where: {
        userId_surveyId_type_day: { ...base, type: "new_responses", day: localDay() },
      },
      create: { ...base, type: "new_responses", day: localDay(), count: 1 },
      update: { count: { increment: 1 }, readAt: null },
    });

    if (survey.responseLimit !== null && survey._count.responses >= survey.responseLimit) {
      await prisma.notification.upsert({
        where: { userId_surveyId_type_day: { ...base, type: "limit_reached", day: "once" } },
        create: { ...base, type: "limit_reached", day: "once", count: 1 },
        update: {},
      });
    }
  } catch (error) {
    console.error("No se pudo registrar la notificación", error);
  }
}
