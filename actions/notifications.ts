"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NOTIFICATION_WINDOW_DAYS } from "@/lib/notifications";

export type NotificationItem = {
  id: string;
  surveyId: string;
  surveyTitle: string;
  type: "new_responses" | "limit_reached";
  count: number;
  detail: string | null;
  updatedAt: string;
  read: boolean;
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  return session.user.id;
}

/** Notifications from the last 30 days, newest first, plus how many are unread. */
export async function getNotifications(): Promise<{ items: NotificationItem[]; unread: number }> {
  const userId = await requireUserId();
  const since = new Date(Date.now() - NOTIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.notification.findMany({
    where: { userId, updatedAt: { gte: since } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { survey: { select: { title: true } } },
  });

  const items = rows.map((row) => ({
    id: row.id,
    surveyId: row.surveyId,
    surveyTitle: row.survey.title,
    type: (row.type === "limit_reached" ? "limit_reached" : "new_responses") as NotificationItem["type"],
    count: row.count,
    detail: row.detail,
    updatedAt: row.updatedAt.toISOString(),
    read: row.readAt !== null,
  }));
  return { items, unread: items.filter((item) => !item.read).length };
}

export async function markNotificationRead(id: string) {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead() {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
