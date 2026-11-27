import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/account/Section";
import { ResponseAlertsToggle } from "@/components/account/AccountForms";

export default async function AccountNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, notifyResponses: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Las notificaciones de tu cuenta ({user.email}) aparecen en el centro de notificaciones
        (la campana del encabezado).
      </p>
      <Section title="Notificaciones de encuestas">
        <ResponseAlertsToggle initial={user.notifyResponses} />
      </Section>
    </div>
  );
}
