import type { AnswerValue } from "@/lib/flow-engine";
import { optionPoints, type QuestionOption } from "@/lib/question-options";
import { SCORABLE_TYPES, type QuestionType } from "@/lib/question-types";

export type ScorableQuestion = {
  type: QuestionType;
  options: QuestionOption[];
  scoringEnabled: boolean;
};

export type OptionReviewState =
  | "selected_correct"
  | "selected_incorrect"
  | "unselected_correct"
  | "unselected_incorrect";

export function isScorableType(type: QuestionType): boolean {
  return SCORABLE_TYPES.includes(type);
}

export function isScoredQuestion(question: ScorableQuestion): boolean {
  return question.scoringEnabled && isScorableType(question.type);
}

/** Max points a respondent can earn on one scored question (SurveyMonkey rules). */
export function questionMaxPoints(question: ScorableQuestion): number {
  if (!isScoredQuestion(question)) return 0;

  const points = question.options.map(optionPoints);
  if (question.type === "multi_choice") {
    // Sum of all correct option points (partial-credit max).
    return points.reduce((sum, value) => sum + value, 0);
  }
  // single_choice | dropdown | image_choice — one selection
  return points.reduce((max, value) => Math.max(max, value), 0);
}

export function selectedOptionValues(type: QuestionType, value: AnswerValue | undefined): string[] {
  if (value === undefined || value === null) return [];
  if (type === "multi_choice") {
    return Array.isArray(value) ? [...new Set(value.map(String))] : [];
  }
  if (typeof value === "string" && value !== "") return [value];
  return [];
}

/**
 * Points earned for one answer.
 * Multi-choice: sum points of selected options that are marked correct (wrong = 0, no subtract).
 * Single-select: points of the selected option if correct, else 0.
 */
export function scoreAnswer(question: ScorableQuestion, value: AnswerValue | undefined): number {
  if (!isScoredQuestion(question) || value === undefined) return 0;

  const selected = selectedOptionValues(question.type, value);
  if (selected.length === 0) return 0;

  const byValue = new Map(question.options.map((option) => [option.value, option]));
  return selected.reduce((sum, optionValue) => {
    const option = byValue.get(optionValue);
    return sum + (option ? optionPoints(option) : 0);
  }, 0);
}

export function optionReviewState(
  option: QuestionOption,
  selectedValues: Iterable<string>,
): OptionReviewState {
  const selected = selectedValues instanceof Set ? selectedValues : new Set(selectedValues);
  const isSelected = selected.has(option.value);
  const isCorrect = Boolean(option.isCorrect) && optionPoints(option) > 0;

  if (isSelected && isCorrect) return "selected_correct";
  if (isSelected && !isCorrect) return "selected_incorrect";
  if (!isSelected && isCorrect) return "unselected_correct";
  return "unselected_incorrect";
}

export function scoreSurvey(
  questions: Array<ScorableQuestion & { id: string }>,
  answers: Record<string, AnswerValue | undefined>,
): { obtained: number; max: number; hasScoring: boolean; percent: number } {
  let obtained = 0;
  let max = 0;
  let hasScoring = false;

  for (const question of questions) {
    if (!isScoredQuestion(question)) continue;
    hasScoring = true;
    max += questionMaxPoints(question);
    obtained += scoreAnswer(question, answers[question.id]);
  }

  const percent = max > 0 ? (obtained / max) * 100 : 0;
  return { obtained, max, hasScoring, percent };
}

/** SurveyMonkey-style: "66.7 %" (one decimal when needed). */
export function formatScorePercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} %`;
}

export function pointsFractionLabel(obtained: number, max: number): string {
  return `${obtained}/${max} puntos`;
}

export function pointsLabel(points: number): string {
  return points === 1 ? "1 punto" : `${points} puntos`;
}
