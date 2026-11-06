import {
  EMPTY_FILTERS,
  filterResponses,
  isAverageType,
  isChoiceType,
  type AnalysisFilterState,
  type AnalysisQuestion,
  type AnalysisResponse,
  type CompletenessFilter,
} from "@/lib/analysis";

export type FilterRule =
  | {
      id: string;
      name: string;
      enabled: boolean;
      kind: "question_answer";
      questionId: string;
      values: string[];
    }
  | {
      id: string;
      name: string;
      enabled: boolean;
      kind: "completeness";
      completeness: Exclude<CompletenessFilter, "all">;
    }
  | {
      id: string;
      name: string;
      enabled: boolean;
      kind: "period";
      dateFrom: string;
      dateTo: string;
    };

/** SurveyMonkey Compare: pick 2+ answers of ONE closed-ended question. */
export type CompareRule = {
  id: string;
  name: string;
  enabled: boolean;
  questionId: string;
  values: string[];
};

/** SurveyMonkey Show: only one active rule; hide all other questions. */
export type ShowRule = {
  id: string;
  name: string;
  enabled: boolean;
  questionIds: string[];
};

export type AnalysisRulesState = {
  filters: FilterRule[];
  compare: CompareRule | null;
  show: ShowRule | null;
};

export const EMPTY_RULES: AnalysisRulesState = {
  filters: [],
  compare: null,
  show: null,
};

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createQuestionFilterRule(
  question: AnalysisQuestion,
  values: string[],
): FilterRule {
  const labels = values.map((value) => optionLabel(question, value));
  return {
    id: rid("f"),
    name: `P${question.index}: ${labels.slice(0, 2).join(", ")}${labels.length > 2 ? "…" : ""}`,
    enabled: true,
    kind: "question_answer",
    questionId: question.id,
    values,
  };
}

export function createCompletenessFilterRule(
  completeness: Exclude<CompletenessFilter, "all">,
): FilterRule {
  return {
    id: rid("f"),
    name: completeness === "completed" ? "Solo finalizadas" : "Solo parciales",
    enabled: true,
    kind: "completeness",
    completeness,
  };
}

export function createPeriodFilterRule(dateFrom: string, dateTo: string): FilterRule {
  return {
    id: rid("f"),
    name: `Periodo: ${dateFrom || "…"} → ${dateTo || "…"}`,
    enabled: true,
    kind: "period",
    dateFrom,
    dateTo,
  };
}

export function createCompareRule(question: AnalysisQuestion, values: string[]): CompareRule {
  const labels = values.map((value) => optionLabel(question, value));
  return {
    id: rid("c"),
    name: `Comparar P${question.index}: ${labels.slice(0, 3).join(", ")}${labels.length > 3 ? "…" : ""}`,
    enabled: true,
    questionId: question.id,
    values,
  };
}

export function createShowRule(questions: AnalysisQuestion[], questionIds: string[]): ShowRule {
  const indexes = questions
    .filter((q) => questionIds.includes(q.id))
    .map((q) => `P${q.index}`);
  return {
    id: rid("s"),
    name: `Mostrar: ${indexes.slice(0, 4).join(", ")}${indexes.length > 4 ? "…" : ""}`,
    enabled: true,
    questionIds,
  };
}

export function optionLabel(question: AnalysisQuestion, value: string): string {
  if (isAverageType(question.type)) return `${value}★`;
  return question.options.find((o) => o.value === value)?.label ?? value;
}

export function comparableQuestions(questions: AnalysisQuestion[]): AnalysisQuestion[] {
  return questions.filter((q) => isChoiceType(q.type) || isAverageType(q.type));
}

export function optionValuesForQuestion(question: AnalysisQuestion): string[] {
  if (isAverageType(question.type)) {
    return Array.from({ length: 5 }, (_, i) => String(i + 1));
  }
  return question.options.map((o) => o.value);
}

/** Merge discrete SM filter rules into the legacy filter state (AND across rules). */
export function rulesToFilterState(rules: FilterRule[]): AnalysisFilterState {
  const enabled = rules.filter((r) => r.enabled);
  let completeness: CompletenessFilter = "all";
  let dateFrom = "";
  let dateTo = "";
  const questionFilters: AnalysisFilterState["questionFilters"] = [];

  for (const rule of enabled) {
    if (rule.kind === "completeness") completeness = rule.completeness;
    if (rule.kind === "period") {
      dateFrom = rule.dateFrom;
      dateTo = rule.dateTo;
    }
    if (rule.kind === "question_answer" && rule.values.length > 0) {
      questionFilters.push({ questionId: rule.questionId, values: rule.values });
    }
  }

  return { completeness, dateFrom, dateTo, questionFilters };
}

export function applyFilterRules(
  responses: AnalysisResponse[],
  rules: FilterRule[],
): AnalysisResponse[] {
  return filterResponses(responses, rulesToFilterState(rules));
}

export function compareSegments(
  questions: AnalysisQuestion[],
  responses: AnalysisResponse[],
  compare: CompareRule | null,
): { key: string; label: string; responses: AnalysisResponse[] }[] {
  if (!compare?.enabled || compare.values.length < 2) return [];
  const question = questions.find((q) => q.id === compare.questionId);
  if (!question) return [];

  return compare.values.map((value) => ({
    key: value,
    label: optionLabel(question, value),
    responses: filterResponses(responses, {
      ...EMPTY_FILTERS,
      questionFilters: [{ questionId: compare.questionId, values: [value] }],
    }),
  }));
}

export function visibleQuestions(
  questions: AnalysisQuestion[],
  show: ShowRule | null,
): AnalysisQuestion[] {
  if (!show?.enabled || show.questionIds.length === 0) return questions;
  const allowed = new Set(show.questionIds);
  return questions.filter((q) => allowed.has(q.id));
}

export function countActiveRules(state: AnalysisRulesState): number {
  const filters = state.filters.filter((r) => r.enabled).length;
  const compare = state.compare?.enabled ? 1 : 0;
  const show = state.show?.enabled ? 1 : 0;
  return filters + compare + show;
}

export function activeRuleChips(
  state: AnalysisRulesState,
): { id: string; kind: "filter" | "compare" | "show"; label: string }[] {
  const chips: { id: string; kind: "filter" | "compare" | "show"; label: string }[] = [];
  for (const rule of state.filters) {
    if (!rule.enabled) continue;
    chips.push({ id: rule.id, kind: "filter", label: rule.name });
  }
  if (state.compare?.enabled) {
    chips.push({ id: state.compare.id, kind: "compare", label: state.compare.name });
  }
  if (state.show?.enabled) {
    chips.push({ id: state.show.id, kind: "show", label: state.show.name });
  }
  return chips;
}
