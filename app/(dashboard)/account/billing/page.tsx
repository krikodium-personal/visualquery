import Link from "next/link";
import { Section, Row } from "@/components/account/Section";

export default function AccountBillingPage() {
  return (
    <div className="flex flex-col gap-8">
      <Section title="Información de pago">
        <p className="text-sm text-muted-foreground">
          Todavía no hay medio de pago ni datos de facturación: los pagos aún no están habilitados.
        </p>
      </Section>
      <Section title="Detalles del plan">
        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="Plan">Gratis</Row>
          <Row label="Facturación">Sin cargo</Row>
        </div>
        <Link href="/precios" className="text-sm text-primary underline-offset-4 hover:underline">
          Ver planes y precios
        </Link>
      </Section>
    </div>
  );
}
