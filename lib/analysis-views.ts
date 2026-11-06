import { z } from "zod";
import {
  EMPTY_RULES,
  type AnalysisRulesState,
  type CompareRule,
  type FilterRule,
  type ShowRule,
} from "@/lib/analysis-rules";

const filterRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    kind: z.literal("question_answer"),
    questionId: z.string(),
    values: z.array(z.string()),
  }),
  z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    kind: z.literal("completeness"),
    completeness: z.enum(["completed", "partial"]),
  }),
  z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    kind: z.literal("period"),
    dateFrom: z.string(),
    dateTo: z.string(),
  }),
]);

const compareRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  questionId: z.string(),
  values: z.array(z.string()),
});

const showRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  questionIds: z.array(z.string()),
});

const rulesStateSchema = z.object({
  filters: z.array(filterRuleSchema),
  compares: z.array(compareRuleSchema),
  shows: z.array(showRuleSchema),
});

/** Previous singular compare/show shape. */
const rulesStateV1Schema = z.object({
  filters: z.array(filterRuleSchema),
  compare: compareRuleSchema.nullable(),
  show: showRuleSchema.nullable(),
});

const analysisViewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  rules: rulesStateSchema,
  createdAt: z.string(),
});

const analysisViewV1Schema = z.object({
  id: z.string(),
  name: z.string(),
  rules: rulesStateV1Schema,
  createdAt: z.string(),
});

const legacyViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  filters: z.object({
    completeness: z.enum(["all", "completed", "partial"]),
    dateFrom: z.string(),
    dateTo: z.string(),
    questionFilters: z.array(
      z.object({ questionId: z.string(), values: z.array(z.string()) }),
    ),
  }),
  compareGroups: z.array(z.unknown()).optional(),
  createdAt: z.string(),
});

export type AnalysisView = z.infer<typeof analysisViewSchema>;

export function parseAnalysisViews(value: unknown): AnalysisView[] {
  if (!Array.isArray(value)) return [];
  const views: AnalysisView[] = [];
  for (const entry of value) {
    const modern = analysisViewSchema.safeParse(entry);
    if (modern.success) {
      views.push(modern.data);
      continue;
    }
    const v1 = analysisViewV1Schema.safeParse(entry);
    if (v1.success) {
      views.push({
        id: v1.data.id,
        name: v1.data.name,
        createdAt: v1.data.createdAt,
        rules: {
          filters: v1.data.rules.filters,
          compares: v1.data.rules.compare ? [v1.data.rules.compare] : [],
          shows: v1.data.rules.show ? [v1.data.rules.show] : [],
        },
      });
      continue;
    }
    const legacy = legacyViewSchema.safeParse(entry);
    if (legacy.success) {
      views.push(legacyToView(legacy.data));
    }
  }
  return views;
}

function legacyToView(legacy: z.infer<typeof legacyViewSchema>): AnalysisView {
  const filters: FilterRule[] = [];
  if (legacy.filters.completeness !== "all") {
    filters.push({
      id: `f_legacy_${legacy.id}_c`,
      name: legacy.filters.completeness === "completed" ? "Solo finalizadas" : "Solo parciales",
      enabled: true,
      kind: "completeness",
      completeness: legacy.filters.completeness,
    });
  }
  if (legacy.filters.dateFrom || legacy.filters.dateTo) {
    filters.push({
      id: `f_legacy_${legacy.id}_p`,
      name: `${legacy.filters.dateFrom || "…"} → ${legacy.filters.dateTo || "…"}`,
      enabled: true,
      kind: "period",
      dateFrom: legacy.filters.dateFrom,
      dateTo: legacy.filters.dateTo,
    });
  }
  for (const [index, qf] of legacy.filters.questionFilters.entries()) {
    if (qf.values.length === 0) continue;
    filters.push({
      id: `f_legacy_${legacy.id}_q${index}`,
      name: "Filtro pregunta",
      enabled: true,
      kind: "question_answer",
      questionId: qf.questionId,
      values: qf.values,
    });
  }
  return {
    id: legacy.id,
    name: legacy.name,
    rules: { filters, compares: [], shows: [] },
    createdAt: legacy.createdAt,
  };
}

export function createAnalysisView(name: string, rules: AnalysisRulesState): AnalysisView {
  return {
    id: `v_${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim(),
    rules: structuredClone(rules),
    createdAt: new Date().toISOString(),
  };
}

export function emptyRules(): AnalysisRulesState {
  return structuredClone(EMPTY_RULES);
}

export type { AnalysisRulesState, CompareRule, FilterRule, ShowRule };
