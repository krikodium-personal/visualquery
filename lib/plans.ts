/** Propuesta de planes. Precios en USD por mes; el anual equivale a ~2 meses gratis. */
export type PlanId = "free" | "pro" | "business" | "enterprise";

/** Prices and flags only; the wording of each plan lives in the marketing content (es/en). */
export type Plan = {
  id: PlanId;
  /** USD per month billed monthly; null = custom pricing. */
  monthly: number | null;
  /** USD per month billed yearly. */
  yearly: number | null;
  highlighted?: boolean;
};

export const EXTRA_RESPONSE_PRICE_USD = 0.02;

export const PLANS: Plan[] = [
  { id: "free", monthly: 0, yearly: 0 },
  { id: "pro", monthly: 12, yearly: 10, highlighted: true },
  { id: "business", monthly: 32, yearly: 27 },
  { id: "enterprise", monthly: null, yearly: null },
];

export function yearlySavingsPercent(plan: Plan): number {
  if (!plan.monthly || !plan.yearly) return 0;
  return Math.round((1 - plan.yearly / plan.monthly) * 100);
}
