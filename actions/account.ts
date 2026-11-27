"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";

async function currentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function updateProfileName(name: string): Promise<ActionResult> {
  const parsed = z.string().trim().min(1, "Ingresá tu nombre").max(80).safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await currentUser();
  if (!user) return { error: "No autenticado" };
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data } });
  revalidatePath("/account", "layout");
  return {};
}

export async function changePassword(current: string, next: string): Promise<ActionResult> {
  const parsed = z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres").safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await currentUser();
  if (!user) return { error: "No autenticado" };
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "La contraseña actual no es correcta" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data, 10) },
  });
  return {};
}

export async function changeEmail(email: string, password: string): Promise<ActionResult> {
  const parsed = z.string().trim().email("Email inválido").safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await currentUser();
  if (!user) return { error: "No autenticado" };
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "La contraseña no es correcta" };
  }
  const taken = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (taken && taken.id !== user.id) return { error: "Ya existe una cuenta con ese email" };
  await prisma.user.update({ where: { id: user.id }, data: { email: parsed.data } });
  revalidatePath("/account", "layout");
  return {};
}

export async function setResponseAlerts(enabled: boolean): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { error: "No autenticado" };
  await prisma.user.update({ where: { id: user.id }, data: { notifyResponses: enabled } });
  revalidatePath("/account/notifications");
  return {};
}

/** Permanently deletes the account with all its surveys and responses (cascade). */
export async function deleteAccount(password: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { error: "No autenticado" };
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "La contraseña no es correcta" };
  }
  await prisma.user.delete({ where: { id: user.id } });
  await signOut({ redirectTo: "/" });
  return {};
}
