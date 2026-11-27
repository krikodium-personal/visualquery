"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PLANS, yearlySavingsPercent, type Plan } from "@/lib/plans";

export function PricingPlans({ loggedIn = false }: { loggedIn?: boolean }) {
  const [yearly, setYearly] = useState(true);
  const savings = yearlySavingsPercent(PLANS.find((plan) => plan.id === "pro")!);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-center gap-1 self-center rounded-full border p-1 text-sm">
        {([false, true] as const).map((isYearly) => (
          <button
            key={String(isYearly)}
            type="button"
            onClick={() => setYearly(isYearly)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              yearly === isYearly ? "bg-foreground text-background" : "text-muted-foreground",
            )}
          >
            {isYearly ? `Anual (−${savings}%)` : "Mensual"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} yearly={yearly} loggedIn={loggedIn} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, yearly, loggedIn }: { plan: Plan; yearly: boolean; loggedIn: boolean }) {
  const price = yearly ? plan.yearly : plan.monthly;
  return (
    <Card className={cn("flex flex-col", plan.highlighted && "border-foreground ring-1 ring-foreground")}>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          {plan.highlighted ? <Badge>Más elegido</Badge> : null}
        </div>
        <p className="min-h-10 text-sm text-muted-foreground">{plan.tagline}</p>
        <p className="mt-2 flex items-baseline gap-1">
          {price === null ? (
            <span className="text-3xl font-semibold">A medida</span>
          ) : (
            <>
              <span className="text-4xl font-semibold tracking-tight">
                {price === 0 ? "Gratis" : `US$${price}`}
              </span>
              {price > 0 ? <span className="text-sm text-muted-foreground">/mes</span> : null}
            </>
          )}
        </p>
        {price !== null && price > 0 && yearly ? (
          <p className="text-xs text-muted-foreground">Facturado US${price * 12} por año</p>
        ) : (
          <p className="text-xs text-muted-foreground">&nbsp;</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {loggedIn ? (
          <Button variant={plan.highlighted ? "default" : "outline"} disabled>
            {plan.id === "free" ? "Tu plan actual" : "Próximamente"}
          </Button>
        ) : (
          <Button
            variant={plan.highlighted ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href="/signup">
                {plan.id === "free" ? "Empezar gratis" : plan.id === "enterprise" ? "Contactanos" : "Elegir plan"}
              </Link>
            }
          />
        )}
        <ul className="flex flex-col gap-1.5 border-b pb-4 text-sm font-medium">
          {plan.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
