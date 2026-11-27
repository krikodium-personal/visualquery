import { isChoiceWithOther, matrixCellKey, type QuestionOption } from "@/lib/question-options";
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
  /** Collector (link) the respondent came through; null if it was deleted. */
  collectorId: string | null;
  /** Values of the survey's custom variables captured from the link. */
  variables: Record<string, string>;
  answers: { questionId: string; value: AnalysisAnswerValue }[];
};

export type AnalysisPayload = {
  surveyTitle: string;
  questions: AnalysisQuestion[];
  edges: AnalysisEdge[];
  responses: AnalysisResponse[];
  customVariables: { name: string; label: string }[];
  collectors: { id: string; name: string }[];
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
  /** Custom-variable values the response must carry (all must match, case-insensitive). */
  variableFilters: { name: string; value: string }[];
  /** Time between starting and finishing, in minutes; unfinished responses never match. */
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
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
  variableFilters: [],
  durationMinMinutes: null,
  durationMaxMinutes: null,
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
  if (typeof answer === "number" && Number.isFinite(answer)) return answer;
  if (typeof answer === "object" && answer !== null && !Array.isArray(answer)) {
    const rating = answer.rating;
    if (typeof rating === "number" && Number.isFinite(rating)) return rating;
  }
  return null;
}

export function countActiveFilters(filters: AnalysisFilterState): number {
  let count = 0;
  if (filters.completeness !== "all") count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  count += filters.questionFilters.filter((f) => f.values.length > 0).length;
  count += filters.variableFilters.length;
  if (filters.durationMinMinutes !== null || filters.durationMaxMinutes !== null) count += 1;
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

    for (const variableFilter of filters.variableFilters) {
      const actual = response.variables[variableFilter.name] ?? "";
      if (actual.toLowerCase() !== variableFilter.value.toLowerCase()) return false;
    }

    if (filters.durationMinMinutes !== null || filters.durationMaxMinutes !== null) {
      if (!response.completedAt) return false;
      const minutes = (new Date(response.completedAt).getTime() - startedMs) / 60000;
      if (filters.durationMinMinutes !== null && minutes < filters.durationMinMinutes) return false;
      if (filters.durationMaxMinutes !== null && minutes > filters.durationMaxMinutes) return false;
    }

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
    const values = Array.isArray(answer)
      ? answer
      : isChoiceWithOther(answer)
        ? [answer.choice]
        : answer !== null && typeof answer !== "object"
          ? [String(answer)]
          : [];
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

export type SummaryTable = {
  columns: string[];
  rows: { label: string; cells: string[] }[];
};

const STRUCTURED_TYPES: QuestionType[] = [
  "ranking",
  "rating_matrix",
  "best_worst",
  "dropdown_matrix",
  "multiple_text",
];

export function isStructuredType(type: QuestionType): boolean {
  return STRUCTURED_TYPES.includes(type);
}

function asRecordAnswer(answer: AnalysisAnswerValue): Record<string, string | number> {
  return typeof answer === "object" && answer !== null && !Array.isArray(answer) ? answer : {};
}

function fmt(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

/** Summary table for the question types that don't fit a simple distribution chart. */
export function buildSummaryTable(
  question: AnalysisQuestion,
  answers: AnalysisAnswerValue[],
): SummaryTable {
  const options = question.options;
  const label = (value: string) => options.find((o) => o.value === value)?.label ?? value;

  if (question.type === "ranking") {
    const rows = options.map((option) => {
      const positions = answers.flatMap((a) =>
        Array.isArray(a) && a.includes(option.value) ? [a.indexOf(option.value) + 1] : [],
      );
      const avg = positions.length
        ? positions.reduce((s, p) => s + p, 0) / positions.length
        : null;
      return { label: option.label, avg, count: positions.length };
    });
    rows.sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));
    return {
      columns: ["Posición promedio", "Respuestas"],
      rows: rows.map((r) => ({
        label: r.label,
        cells: [r.avg === null ? "—" : fmt(r.avg), String(r.count)],
      })),
    };
  }

  if (question.type === "rating_matrix") {
    return {
      columns: ["Promedio", "Respuestas"],
      rows: options.map((option) => {
        const values = answers
          .map((a) => Number(asRecordAnswer(a)[option.value]))
          .filter((v) => Number.isFinite(v) && v > 0);
        const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
        return { label: option.label, cells: [avg === null ? "—" : fmt(avg), String(values.length)] };
      }),
    };
  }

  if (question.type === "best_worst") {
    return {
      columns: ["Mejor", "Peor"],
      rows: options.map((option) => ({
        label: option.label,
        cells: (["best", "worst"] as const).map((key) =>
          String(answers.filter((a) => asRecordAnswer(a)[key] === option.value).length),
        ),
      })),
    };
  }

  if (question.type === "multiple_text") {
    return {
      columns: ["Respuestas", "Ejemplos"],
      rows: options.map((option) => {
        const texts = answers
          .map((a) => String(asRecordAnswer(a)[option.value] ?? "").trim())
          .filter(Boolean);
        return { label: option.label, cells: [String(texts.length), texts.slice(0, 3).join(" · ") || "—"] };
      }),
    };
  }

  // dropdown_matrix: how often each choice was picked per row (and per column when present).
  const rowOptions = options.filter((o) => o.kind === "row");
  const columns = options.filter((o) => o.kind === "column");
  const tally = (key: string) => {
    const counts = new Map<string, number>();
    for (const a of answers) {
      const v = asRecordAnswer(a)[key];
      if (v === undefined || v === "") continue;
      counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, n]) => `${label(value)}: ${n}`)
      .join(" · ") || "—";
  };
  if (columns.length >= 2) {
    return {
      columns: columns.map((c) => c.label),
      rows: rowOptions.map((row) => ({
        label: row.label,
        cells: columns.map((c) => tally(matrixCellKey(row.value, c.value))),
      })),
    };
  }
  return {
    columns: ["Respuestas"],
    rows: rowOptions.map((row) => ({ label: row.label, cells: [tally(row.value)] })),
  };
}
