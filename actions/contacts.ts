"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import {
  contactInputSchema,
  MAX_IMPORT_ROWS,
  parseContactsText,
  type ContactInput,
} from "@/lib/contacts";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const refresh = () => revalidatePath("/contacts");

export async function createContact(input: ContactInput, groupId?: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const exists = await prisma.contact.findUnique({
    where: { userId_email: { userId, email: parsed.data.email } },
  });
  if (exists) return { error: "Ya tenés un contacto con ese email" };
  const group = groupId
    ? await prisma.contactGroup.findFirst({ where: { id: groupId, userId }, select: { id: true } })
    : null;
  await prisma.contact.create({
    data: { ...parsed.data, userId, ...(group ? { groups: { create: { groupId: group.id } } } : {}) },
  });
  refresh();
  return {};
}

export async function updateContact(id: string, input: ContactInput): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const clash = await prisma.contact.findFirst({
    where: { userId, email: parsed.data.email, NOT: { id } },
  });
  if (clash) return { error: "Ya tenés un contacto con ese email" };
  const result = await prisma.contact.updateMany({
    where: { id, userId },
    data: {
      email: parsed.data.email,
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
      language: parsed.data.language || null,
      custom1: parsed.data.custom1 || null,
      custom2: parsed.data.custom2 || null,
      custom3: parsed.data.custom3 || null,
    },
  });
  if (result.count === 0) return { error: "Contacto no encontrado" };
  refresh();
  return {};
}

export async function deleteContacts(ids: string[]): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  await prisma.contact.deleteMany({ where: { userId, id: { in: ids } } });
  refresh();
  return {};
}

/** Adds the contacts found in the text; existing emails are kept (not duplicated). */
export async function importContacts(
  text: string,
  groupId?: string,
): Promise<ActionResult & { added?: number; existing?: number; invalid?: number }> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const { rows, invalid } = parseContactsText(text);
  if (rows.length === 0) return { error: "No encontré ningún email válido" };
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Importá hasta ${MAX_IMPORT_ROWS} contactos por vez` };

  const unique = [...new Map(rows.map((row) => [row.email, row])).values()];
  const found = await prisma.contact.findMany({
    where: { userId, email: { in: unique.map((row) => row.email) } },
    select: { id: true, email: true },
  });
  const known = new Set(found.map((c) => c.email));
  const fresh = unique.filter((row) => !known.has(row.email));
  if (fresh.length > 0) {
    await prisma.contact.createMany({ data: fresh.map((row) => ({ ...row, userId })) });
  }

  if (groupId) {
    const group = await prisma.contactGroup.findFirst({ where: { id: groupId, userId }, select: { id: true } });
    if (group) {
      const all = await prisma.contact.findMany({
        where: { userId, email: { in: unique.map((row) => row.email) } },
        select: { id: true },
      });
      await prisma.contactGroupMember.createMany({
        data: all.map((c) => ({ contactId: c.id, groupId: group.id })),
        skipDuplicates: true,
      });
    }
  }
  refresh();
  return { added: fresh.length, existing: unique.length - fresh.length, invalid };
}

const groupNameSchema = z.string().trim().min(1, "Ingresá un nombre").max(60);

export async function createGroup(name: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const parsed = groupNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const exists = await prisma.contactGroup.findUnique({ where: { userId_name: { userId, name: parsed.data } } });
  if (exists) return { error: "Ya existe un grupo con ese nombre" };
  const group = await prisma.contactGroup.create({ data: { userId, name: parsed.data } });
  refresh();
  return { id: group.id };
}

export async function renameGroup(id: string, name: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const parsed = groupNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const clash = await prisma.contactGroup.findFirst({ where: { userId, name: parsed.data, NOT: { id } } });
  if (clash) return { error: "Ya existe un grupo con ese nombre" };
  await prisma.contactGroup.updateMany({ where: { id, userId }, data: { name: parsed.data } });
  refresh();
  return {};
}

/** Deletes the group only; its contacts stay in "Todos los contactos". */
export async function deleteGroup(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  await prisma.contactGroup.deleteMany({ where: { id, userId } });
  refresh();
  return {};
}

export async function addContactsToGroup(contactIds: string[], groupId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const group = await prisma.contactGroup.findFirst({ where: { id: groupId, userId }, select: { id: true } });
  if (!group) return { error: "Grupo no encontrado" };
  const owned = await prisma.contact.findMany({ where: { userId, id: { in: contactIds } }, select: { id: true } });
  await prisma.contactGroupMember.createMany({
    data: owned.map((c) => ({ contactId: c.id, groupId })),
    skipDuplicates: true,
  });
  refresh();
  return {};
}

export async function removeContactsFromGroup(contactIds: string[], groupId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const group = await prisma.contactGroup.findFirst({ where: { id: groupId, userId }, select: { id: true } });
  if (!group) return { error: "Grupo no encontrado" };
  await prisma.contactGroupMember.deleteMany({ where: { groupId, contactId: { in: contactIds } } });
  refresh();
  return {};
}
