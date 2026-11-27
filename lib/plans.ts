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
  /** AI credits per calendar month; null = custom. */
  aiMonthly: number | null;
};

/** Extra responses are sold per 1,000 (marginal cost is ~US$0.00002 each; see pricing notes). */
export const EXTRA_RESPONSES_PRICE_PER_1000_USD = 1;
/** Extra AI credits: 2x their cost (1 credit = US$0.004 of model usage). */
export const EXTRA_AI_CREDITS_PRICE_PER_1000_USD = 8;

export const PLANS: Plan[] = [
  { id: "free", monthly: 0, yearly: 0, aiMonthly: 50 },
  { id: "pro", monthly: 12, yearly: 10, highlighted: true, aiMonthly: 700 },
  { id: "business", monthly: 32, yearly: 27, aiMonthly: 2200 },
  { id: "enterprise", monthly: null, yearly: null, aiMonthly: null },
];

export function yearlySavingsPercent(plan: Plan): number {
  if (!plan.monthly || !plan.yearly) return 0;
  return Math.round((1 - plan.yearly / plan.monthly) * 100);
}

/**
 * AI usage is metered in credits: 1 credit = 1,000 cost-weighted tokens (input + 5 x output, since
 * output costs 5x more), i.e. ~US$0.004 with claude-opus-5-5. A 10-question survey is ~11 credits.
 * Allowances: 50 -> ~US$0.20, 700 -> ~US$2.80 (~23% of Pro), 2200 -> ~US$8.80 (~27% of Business).
 * If you change a number, update the matching line in components/marketing/content.ts.
 *
 * Plan whose allowance applies to every account until billing exists (see the pricing note:
 * for now all accounts use Visualquery at no cost).
 */
export const CURRENT_ACCOUNT_PLAN: PlanId = "pro";

export function aiMonthlyLimit(planId: PlanId): number | null {
  return PLANS.find((plan) => plan.id === planId)?.aiMonthly ?? null;
}

/** Credits spent by one generation, from the token usage the API reported. */
export function aiCredits(inputTokens: number, outputTokens: number): number {
  return (inputTokens + 5 * outputTokens) / 1000;
}
