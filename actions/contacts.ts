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

const groupNameSchema = z.string().trim().min(1, "Ingresá un nombre").max(60);

/** Creates a contact; optionally adds it to an existing group or to a new one (created if missing). */
export async function createContact(
  input: ContactInput,
  group?: { id?: string; newName?: string },
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const exists = await prisma.contact.findUnique({
    where: { userId_email: { userId, email: parsed.data.email } },
  });
  if (exists) return { error: "Ya tenés un contacto con ese email" };

  let groupId: string | null = null;
  if (group?.newName !== undefined) {
    const name = groupNameSchema.safeParse(group.newName);
    if (!name.success) return { error: name.error.issues[0].message };
    const found = await prisma.contactGroup.findUnique({
      where: { userId_name: { userId, name: name.data } },
    });
    groupId = found
      ? found.id
      : (await prisma.contactGroup.create({ data: { userId, name: name.data } })).id;
  } else if (group?.id) {
    const found = await prisma.contactGroup.findFirst({
      where: { id: group.id, userId },
      select: { id: true },
    });
    groupId = found?.id ?? null;
  }

  await prisma.contact.create({
    data: { ...parsed.data, userId, ...(groupId ? { groups: { create: { groupId } } } : {}) },
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

export type ImportOptions = {
  /** Add every imported contact to this group (existing id, or a name to find/create). */
  group?: { id?: string; newName?: string };
  includesLanguage: boolean;
  /** What to do with emails that already exist. */
  onExisting: "update" | "ignore";
};

/** Adds the contacts found in the text, handling emails that already exist per `onExisting`. */
export async function importContacts(
  text: string,
  options: ImportOptions,
): Promise<ActionResult & { added?: number; updated?: number; ignored?: number; invalid?: number }> {
  const userId = await requireUserId();
  if (!userId) return { error: "No autenticado" };
  const { rows, invalid } = parseContactsText(text, options.includesLanguage);
  if (rows.length === 0) return { error: "No encontré ningún email válido" };
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Importá hasta ${MAX_IMPORT_ROWS} contactos por vez` };

  let groupId: string | null = null;
  if (options.group?.newName !== undefined) {
    const name = groupNameSchema.safeParse(options.group.newName);
    if (!name.success) return { error: name.error.issues[0].message };
    const found = await prisma.contactGroup.findUnique({ where: { userId_name: { userId, name: name.data } } });
    groupId = found ? found.id : (await prisma.contactGroup.create({ data: { userId, name: name.data } })).id;
  } else if (options.group?.id) {
    const found = await prisma.contactGroup.findFirst({ where: { id: options.group.id, userId }, select: { id: true } });
    if (!found) return { error: "Grupo no encontrado" };
    groupId = found.id;
  }

  const unique = [...new Map(rows.map((row) => [row.email, row])).values()];
  const found = await prisma.contact.findMany({
    where: { userId, email: { in: unique.map((row) => row.email) } },
    select: { id: true, email: true },
  });
  const known = new Map(found.map((c) => [c.email, c.id]));
  const fresh = unique.filter((row) => !known.has(row.email));
  const existing = unique.filter((row) => known.has(row.email));

  if (fresh.length > 0) {
    await prisma.contact.createMany({ data: fresh.map((row) => ({ ...row, userId })) });
  }
  if (options.onExisting === "update") {
    // Only overwrite the fields the file actually provides.
    for (const row of existing) {
      const { email, ...fields } = row;
      const data = Object.fromEntries(Object.entries(fields).filter(([, value]) => value));
      if (Object.keys(data).length > 0) {
        await prisma.contact.updateMany({ where: { id: known.get(email), userId }, data });
      }
    }
  }

  if (groupId) {
    const all = await prisma.contact.findMany({
      where: { userId, email: { in: unique.map((row) => row.email) } },
      select: { id: true },
    });
    await prisma.contactGroupMember.createMany({
      data: all.map((c) => ({ contactId: c.id, groupId: groupId! })),
      skipDuplicates: true,
    });
  }
  refresh();
  return {
    added: fresh.length,
    updated: options.onExisting === "update" ? existing.length : 0,
    ignored: options.onExisting === "ignore" ? existing.length : 0,
    invalid,
  };
}

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
