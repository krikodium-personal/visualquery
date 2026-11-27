"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fill, type Content } from "@/components/marketing/content";
import { cn } from "@/lib/utils";
import { PLANS, yearlySavingsPercent, type Plan } from "@/lib/plans";

type PricingText = Content["pricing"];

export function PricingPlans({ loggedIn = false, t }: { loggedIn?: boolean; t: PricingText }) {
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
            {isYearly ? fill(t.yearly, { pct: savings }) : t.monthly}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} yearly={yearly} loggedIn={loggedIn} t={t} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, yearly, loggedIn, t }: { plan: Plan; yearly: boolean; loggedIn: boolean; t: PricingText }) {
  const price = yearly ? plan.yearly : plan.monthly;
  const text = t.plans[plan.id];
  const ctaLabel = plan.id === "free" ? t.startFree : plan.id === "enterprise" ? t.contact : t.choose;
  return (
    <Card className={cn("flex flex-col", plan.highlighted && "border-foreground ring-1 ring-foreground")}>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{text.name}</CardTitle>
          {plan.highlighted ? <Badge>{t.popular}</Badge> : null}
        </div>
        <p className="min-h-10 text-sm text-muted-foreground">{text.tagline}</p>
        <p className="mt-2 flex items-baseline gap-1">
          {price === null ? (
            <span className="text-3xl font-semibold">{t.custom}</span>
          ) : (
            <>
              <span className="text-4xl font-semibold tracking-tight">{price === 0 ? t.free : `US$${price}`}</span>
              {price > 0 ? <span className="text-sm text-muted-foreground">{t.perMonth}</span> : null}
            </>
          )}
        </p>
        {price !== null && price > 0 && yearly ? (
          <p className="text-xs text-muted-foreground">{fill(t.billedYearly, { amount: price * 12 })}</p>
        ) : (
          <p className="text-xs text-muted-foreground">&nbsp;</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {loggedIn ? (
          <Button variant={plan.highlighted ? "default" : "outline"} disabled>
            {plan.id === "free" ? t.current : t.soonShort}
          </Button>
        ) : (
          <Button
            variant={plan.highlighted ? "default" : "outline"}
            nativeButton={false}
            render={<Link href="/signup">{ctaLabel}</Link>}
          />
        )}
        <ul className="flex flex-col gap-1.5 border-b pb-4 text-sm font-medium">
          {text.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2 text-sm">
          {text.features.map((feature) => (
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
