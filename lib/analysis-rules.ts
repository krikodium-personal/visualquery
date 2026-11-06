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

/** SurveyMonkey Show: hide all questions not listed. */
export type ShowRule = {
  id: string;
  name: string;
  enabled: boolean;
  questionIds: string[];
};

/**
 * All parameters live as separate toggleable items (SM "Parámetros" list).
 * Active filters AND together; one active compare drives side-by-side; one active show hides Qs.
 */
export type AnalysisRulesState = {
  filters: FilterRule[];
  compares: CompareRule[];
  shows: ShowRule[];
};

export const EMPTY_RULES: AnalysisRulesState = {
  filters: [],
  compares: [],
  shows: [],
};

export type ParameterListItem =
  | { type: "filter"; rule: FilterRule }
  | { type: "compare"; rule: CompareRule }
  | { type: "show"; rule: ShowRule };

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** "Director/a (6), Director/a Senior (7) +1" style truncation. */
export function truncateLabels(labels: string[], max = 2): string {
  if (labels.length === 0) return "";
  const head = labels.slice(0, max).join(", ");
  const extra = labels.length - max;
  return extra > 0 ? `${head} +${extra}` : head;
}

export function filterRuleLabel(rule: FilterRule, questions: AnalysisQuestion[]): string {
  if (rule.kind === "completeness") {
    return rule.completeness === "completed" ? "Solo finalizadas" : "Solo parciales";
  }
  if (rule.kind === "period") {
    return `${rule.dateFrom || "…"} → ${rule.dateTo || "…"}`;
  }
  const question = questions.find((q) => q.id === rule.questionId);
  const labels = rule.values.map((value) =>
    question ? optionLabel(question, value) : value,
  );
  const prefix = question ? `P${question.index}` : "P?";
  return `${prefix}: ${truncateLabels(labels)}`;
}

export function compareRuleLabel(rule: CompareRule, questions: AnalysisQuestion[]): string {
  const question = questions.find((q) => q.id === rule.questionId);
  const labels = rule.values.map((value) =>
    question ? optionLabel(question, value) : value,
  );
  const prefix = question ? `P${question.index}` : "P?";
  return `${prefix}: ${truncateLabels(labels)}`;
}

export function showRuleLabel(rule: ShowRule, questions: AnalysisQuestion[]): string {
  const indexes = questions
    .filter((q) => rule.questionIds.includes(q.id))
    .map((q) => `P${q.index}`);
  return truncateLabels(indexes, 4) || `${rule.questionIds.length} preguntas`;
}

export function createQuestionFilterRule(
  question: AnalysisQuestion,
  values: string[],
): FilterRule {
  return {
    id: rid("f"),
    name: `P${question.index}: ${truncateLabels(values.map((v) => optionLabel(question, v)))}`,
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
    name: `${dateFrom || "…"} → ${dateTo || "…"}`,
    enabled: true,
    kind: "period",
    dateFrom,
    dateTo,
  };
}

export function createCompareRule(question: AnalysisQuestion, values: string[]): CompareRule {
  return {
    id: rid("c"),
    name: `P${question.index}: ${truncateLabels(values.map((v) => optionLabel(question, v)))}`,
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
    name: truncateLabels(indexes, 4),
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

/** Flat Parámetros list: compares first (as in SM), then filters, then show. */
export function parameterList(state: AnalysisRulesState): ParameterListItem[] {
  return [
    ...state.compares.map((rule) => ({ type: "compare" as const, rule })),
    ...state.filters.map((rule) => ({ type: "filter" as const, rule })),
    ...state.shows.map((rule) => ({ type: "show" as const, rule })),
  ];
}

/** Active compare used for side-by-side (first enabled with ≥2 values). */
export function activeCompare(state: AnalysisRulesState): CompareRule | null {
  return state.compares.find((rule) => rule.enabled && rule.values.length >= 2) ?? null;
}

export function activeShow(state: AnalysisRulesState): ShowRule | null {
  return state.shows.find((rule) => rule.enabled && rule.questionIds.length > 0) ?? null;
}

/** Merge discrete SM filter rules into filter state (AND across rules). */
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
  return (
    state.filters.filter((r) => r.enabled).length +
    state.compares.filter((r) => r.enabled).length +
    state.shows.filter((r) => r.enabled).length
  );
}

export function activeRuleChips(
  state: AnalysisRulesState,
  questions: AnalysisQuestion[],
): { id: string; kind: "filter" | "compare" | "show"; label: string }[] {
  const chips: { id: string; kind: "filter" | "compare" | "show"; label: string }[] = [];
  for (const rule of state.compares) {
    if (!rule.enabled) continue;
    chips.push({
      id: rule.id,
      kind: "compare",
      label: `Comparar: ${compareRuleLabel(rule, questions)}`,
    });
  }
  for (const rule of state.filters) {
    if (!rule.enabled) continue;
    chips.push({
      id: rule.id,
      kind: "filter",
      label: `Filtrar: ${filterRuleLabel(rule, questions)}`,
    });
  }
  for (const rule of state.shows) {
    if (!rule.enabled) continue;
    chips.push({
      id: rule.id,
      kind: "show",
      label: `Mostrar: ${showRuleLabel(rule, questions)}`,
    });
  }
  return chips;
}

/**
 * Toggle a parameter. Enabling a compare disables other compares (SM: one compare
 * drives the crosstab). Enabling a show disables other shows. Filters stay independent.
 */
export function toggleParameter(
  state: AnalysisRulesState,
  kind: "filter" | "compare" | "show",
  id: string,
): AnalysisRulesState {
  if (kind === "filter") {
    return {
      ...state,
      filters: state.filters.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    };
  }
  if (kind === "compare") {
    const target = state.compares.find((rule) => rule.id === id);
    if (!target) return state;
    const turningOn = !target.enabled;
    return {
      ...state,
      compares: state.compares.map((rule) => {
        if (rule.id === id) return { ...rule, enabled: turningOn };
        if (turningOn) return { ...rule, enabled: false };
        return rule;
      }),
    };
  }
  const target = state.shows.find((rule) => rule.id === id);
  if (!target) return state;
  const turningOn = !target.enabled;
  return {
    ...state,
    shows: state.shows.map((rule) => {
      if (rule.id === id) return { ...rule, enabled: turningOn };
      if (turningOn) return { ...rule, enabled: false };
      return rule;
    }),
  };
}

export function deleteParameter(
  state: AnalysisRulesState,
  kind: "filter" | "compare" | "show",
  id: string,
): AnalysisRulesState {
  if (kind === "filter") {
    return { ...state, filters: state.filters.filter((rule) => rule.id !== id) };
  }
  if (kind === "compare") {
    return { ...state, compares: state.compares.filter((rule) => rule.id !== id) };
  }
  return { ...state, shows: state.shows.filter((rule) => rule.id !== id) };
}
