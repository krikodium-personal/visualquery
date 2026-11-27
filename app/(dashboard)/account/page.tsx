import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Row, Section } from "@/components/account/Section";
import { DeleteAccount, EmailForm, NameForm, PasswordForm } from "@/components/account/AccountForms";

export default async function AccountSummaryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, createdAt: true, _count: { select: { surveys: true } } },
  });
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-8">
      <Section title="Detalles de la cuenta">
        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="Plan">
            Gratis{" "}
            <Link href="/precios" className="ml-2 text-primary underline-offset-4 hover:underline">
              Ver planes
            </Link>
          </Row>
          <Row label="Límite de respuestas">Sin límite por ahora</Row>
          <Row label="Encuestas">{user._count.surveys}</Row>
          <Row label="Miembro desde">
            {user.createdAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </Row>
        </div>
        <p className="text-xs text-muted-foreground">
          Los pagos todavía no están habilitados: todas las cuentas usan Visualquery sin cargo.
        </p>
      </Section>

      <Section title="Perfil">
        <NameForm initial={user.name ?? ""} />
        <EmailForm initial={user.email} />
        <PasswordForm />
        <Row label="Autenticación de dos factores">
          <Badge variant="secondary">Próximamente</Badge>
        </Row>
      </Section>

      <Section title="Eliminar cuenta">
        <p className="text-sm text-muted-foreground">
          Borra tu cuenta, tus encuestas y todas las respuestas recibidas.
        </p>
        <div>
          <DeleteAccount />
        </div>
      </Section>
    </div>
  );
}
