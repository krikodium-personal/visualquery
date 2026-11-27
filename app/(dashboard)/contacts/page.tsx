import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContactsManager } from "@/components/contacts/ContactsManager";

export default async function ContactsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [contacts, groups] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { groups: { select: { groupId: true } } },
    }),
    prisma.contactGroup.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ContactsManager
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      contacts={contacts.map((c) => ({
        id: c.id,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        language: c.language,
        custom1: c.custom1,
        custom2: c.custom2,
        custom3: c.custom3,
        groupIds: c.groups.map((m) => m.groupId),
      }))}
    />
  );
}
