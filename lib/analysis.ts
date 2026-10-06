import type { QuestionOption } from "@/lib/question-options";
import type { QuestionType } from "@/lib/question-types";

export type AnalysisAnswerValue =
  | string
  | string[]
  | number
  | Record<string, string | number>
  | null;

export type AnalysisQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  index: number;
  isRoot: boolean;
};

export type AnalysisEdge = {
  sourceQuestionId: string;
  targetQuestionId: string;
  sourceOptionValue: string | null;
};

export type AnalysisResponse = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  answers: { questionId: string; value: AnalysisAnswerValue }[];
};

export type AnalysisPayload = {
  surveyTitle: string;
  questions: AnalysisQuestion[];
  edges: AnalysisEdge[];
  responses: AnalysisResponse[];
};

export type CompletenessFilter = "all" | "completed" | "partial";

export type QuestionAnswerFilter = {
  questionId: string;
  values: string[];
};

export type AnalysisFilterState = {
  completeness: CompletenessFilter;
  dateFrom: string;
  dateTo: string;
  questionFilters: QuestionAnswerFilter[];
};

export type ChartViewMode =
  | "rating"
  | "bar_vertical"
  | "bar_horizontal"
  | "donut"
  | "trend";

export type CountRow = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

export const EMPTY_FILTERS: AnalysisFilterState = {
  completeness: "all",
  dateFrom: "",
  dateTo: "",
  questionFilters: [],
};

export const RATING_MAX = 5;

export function readAnswerValue(value: unknown): AnalysisAnswerValue {
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string | number] =>
          typeof entry[1] === "string" || typeof entry[1] === "number",
      ),
    );
  }
  return null;
}

export function answerIncludesValue(answer: AnalysisAnswerValue, value: string): boolean {
  if (answer === null) return false;
  if (typeof answer === "string") return answer === value;
  if (typeof answer === "number") return String(answer) === value;
  if (Array.isArray(answer)) return answer.includes(value);
  return Object.values(answer).some((entry) => String(entry) === value);
}

export function answerNumeric(answer: AnalysisAnswerValue): number | null {
  return typeof answer === "number" && Number.isFinite(answer) ? answer : null;
}

export function countActiveFilters(filters: AnalysisFilterState): number {
  let count = 0;
  if (filters.completeness !== "all") count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  count += filters.questionFilters.filter((f) => f.values.length > 0).length;
  return count;
}

export function filterResponses(
  responses: AnalysisResponse[],
  filters: AnalysisFilterState,
): AnalysisResponse[] {
  const fromMs = filters.dateFrom ? startOfDayMs(filters.dateFrom) : null;
  const toMs = filters.dateTo ? endOfDayMs(filters.dateTo) : null;

  return responses.filter((response) => {
    if (filters.completeness === "completed" && !response.completedAt) return false;
    if (filters.completeness === "partial" && response.completedAt) return false;

    const startedMs = new Date(response.startedAt).getTime();
    if (fromMs !== null && startedMs < fromMs) return false;
    if (toMs !== null && startedMs > toMs) return false;

    for (const questionFilter of filters.questionFilters) {
      if (questionFilter.values.length === 0) continue;
      const answer = response.answers.find((a) => a.questionId === questionFilter.questionId);
      const value = answer?.value ?? null;
      const matches = questionFilter.values.some((v) => answerIncludesValue(value, v));
      if (!matches) return false;
    }

    return true;
  });
}

export function answersForQuestion(
  responses: AnalysisResponse[],
  questionId: string,
): AnalysisAnswerValue[] {
  return responses
    .map((response) => response.answers.find((a) => a.questionId === questionId)?.value ?? null)
    .filter((value) => value !== null && value !== "");
}

export function buildChoiceRows(
  options: QuestionOption[],
  answers: AnalysisAnswerValue[],
): CountRow[] {
  const counts = new Map(options.map((option) => [option.value, 0]));
  let totalSelections = 0;

  for (const answer of answers) {
    const values = Array.isArray(answer) ? answer : answer !== null ? [String(answer)] : [];
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      totalSelections += 1;
    }
  }

  const denominator = answers.length || 1;
  return options.map((option) => {
    const count = counts.get(option.value) ?? 0;
    return {
      key: option.value,
      label: option.label,
      count,
      percentage: Math.round((count / denominator) * 10000) / 100,
    };
  });
}

export function buildRatingRows(answers: AnalysisAnswerValue[], max = RATING_MAX): CountRow[] {
  const values = answers.map(answerNumeric).filter((v): v is number => v !== null);
  const denominator = values.length || 1;
  return Array.from({ length: max }, (_, index) => {
    const n = max - index; // high → low like SurveyMonkey
    const count = values.filter((value) => value === n).length;
    return {
      key: String(n),
      label: String(n),
      count,
      percentage: Math.round((count / denominator) * 10000) / 100,
    };
  });
}

/** Bucket a 0–100 slider into five bands for distribution charts. */
export function buildSliderRows(answers: AnalysisAnswerValue[]): CountRow[] {
  const values = answers.map(answerNumeric).filter((v): v is number => v !== null);
  const denominator = values.length || 1;
  const bands = [
    { key: "81-100", label: "81–100", min: 81, max: 100 },
    { key: "61-80", label: "61–80", min: 61, max: 80 },
    { key: "41-60", label: "41–60", min: 41, max: 60 },
    { key: "21-40", label: "21–40", min: 21, max: 40 },
    { key: "0-20", label: "0–20", min: 0, max: 20 },
  ];
  return bands.map((band) => {
    const count = values.filter((value) => value >= band.min && value <= band.max).length;
    return {
      key: band.key,
      label: band.label,
      count,
      percentage: Math.round((count / denominator) * 10000) / 100,
    };
  });
}

export function averageOf(answers: AnalysisAnswerValue[]): number | null {
  const values = answers.map(answerNumeric).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildTrendPoints(
  responses: AnalysisResponse[],
  questionId: string,
  mode: "count" | "average",
): { label: string; value: number }[] {
  const buckets = new Map<string, number[]>();

  for (const response of responses) {
    const day = response.startedAt.slice(0, 10);
    const answer = response.answers.find((a) => a.questionId === questionId)?.value ?? null;
    if (answer === null || answer === "") continue;

    const list = buckets.get(day) ?? [];
    if (mode === "average") {
      const numeric = answerNumeric(answer);
      if (numeric !== null) list.push(numeric);
    } else {
      const selections = Array.isArray(answer) ? answer.length : 1;
      list.push(selections);
    }
    buckets.set(day, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => ({
      label: formatDayLabel(day),
      value:
        mode === "average"
          ? values.reduce((sum, value) => sum + value, 0) / (values.length || 1)
          : values.length,
    }));
}

export function defaultViewForType(type: QuestionType): ChartViewMode {
  if (type === "rating" || type === "slider") return "rating";
  return "bar_vertical";
}

export function viewsForType(type: QuestionType): ChartViewMode[] {
  if (type === "rating" || type === "slider") {
    return ["rating", "bar_horizontal", "donut", "trend"];
  }
  if (
    type === "single_choice" ||
    type === "multi_choice" ||
    type === "dropdown" ||
    type === "image_choice"
  ) {
    return ["bar_vertical", "bar_horizontal", "donut", "trend"];
  }
  return [];
}

export function isChoiceType(type: QuestionType): boolean {
  return (
    type === "single_choice" ||
    type === "multi_choice" ||
    type === "dropdown" ||
    type === "image_choice"
  );
}

export function isAverageType(type: QuestionType): boolean {
  return type === "rating" || type === "slider";
}

export function isStarRatingType(type: QuestionType): boolean {
  return type === "rating";
}

export function filterChipLabels(
  filters: AnalysisFilterState,
  questions: AnalysisQuestion[],
): string[] {
  const chips: string[] = [];
  if (filters.completeness === "completed") chips.push("Completitud: finalizadas");
  if (filters.completeness === "partial") chips.push("Completitud: parciales");
  if (filters.dateFrom || filters.dateTo) {
    chips.push(
      `Periodo: ${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`,
    );
  }
  for (const questionFilter of filters.questionFilters) {
    if (questionFilter.values.length === 0) continue;
    const question = questions.find((q) => q.id === questionFilter.questionId);
    if (!question) continue;
    const labels = questionFilter.values.map((value) => {
      if (isAverageType(question.type)) return value;
      return question.options.find((option) => option.value === value)?.label ?? value;
    });
    const preview = labels.slice(0, 2).join(", ");
    const extra = labels.length > 2 ? ` +${labels.length - 2}` : "";
    chips.push(`P${question.index}: ${preview}${extra}`);
  }
  return chips;
}

function startOfDayMs(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00`).getTime();
}

function endOfDayMs(isoDate: string): number {
  return new Date(`${isoDate}T23:59:59.999`).getTime();
}

function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}
