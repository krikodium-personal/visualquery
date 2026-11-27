import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { COMING_SOON, EXTRA_RESPONSE_PRICE_USD } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Planes y precios · Visualquery",
  description: "Elegí el plan de Visualquery que se ajusta a tu volumen de encuestas.",
};

export default function PricingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold">
            Visualquery
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login">Iniciar sesión</Link>} />
            <Button size="sm" nativeButton={false} render={<Link href="/signup">Crear cuenta</Link>} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight">Planes y precios</h1>
          <p className="mt-3 text-muted-foreground">
            Empezá gratis y pasá a un plan pago cuando necesites más respuestas, más enlaces o
            segmentación avanzada.
          </p>
        </div>

        <PricingPlans />

        <section className="grid gap-8 rounded-xl border bg-muted/20 p-6 md:grid-cols-2">
          <div>
            <h2 className="font-semibold">Respuestas adicionales</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Si superás el límite mensual de tu plan, cada respuesta extra cuesta US$
              {EXTRA_RESPONSE_PRICE_USD.toFixed(2)}. Las encuestas siguen funcionando: no se
              cortan a mitad del mes.
            </p>
          </div>
          <div>
            <h2 className="font-semibold">Próximamente</h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {COMING_SOON.map((item) => (
                <li key={item} className="rounded-full border bg-background px-3 py-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Los pagos todavía no están habilitados: por ahora todas las cuentas usan Visualquery sin cargo.
        </p>
      </main>
    </div>
  );
}
