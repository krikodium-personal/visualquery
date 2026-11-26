export interface FlowEdge {
  sourceQuestionId: string;
  targetQuestionId: string;
  sourceOptionValue: string | null;
}

export type AnswerValue = string | string[] | number | Record<string, string | number>;

export function answerMatchesOption(answer: AnswerValue, optionValue: string): boolean {
  if (Array.isArray(answer)) return answer.includes(optionValue);
  if (typeof answer === "object") return Object.values(answer).some((value) => String(value) === optionValue);
  return String(answer) === optionValue;
}

/**
 * Resolves the next question after answering `currentQuestionId` with `answer`.
 * Prefers a conditional edge whose option matches the given answer; falls back
 * to the default ("next in sequence") edge; returns null when the survey ends.
 */
export function resolveNextQuestionId(
  currentQuestionId: string,
  answer: AnswerValue | undefined,
  edges: FlowEdge[],
): string | null {
  const outgoing = edges.filter((e) => e.sourceQuestionId === currentQuestionId);

  if (answer !== undefined) {
    const branch = outgoing.find(
      (e) => e.sourceOptionValue !== null && answerMatchesOption(answer, e.sourceOptionValue),
    );
    if (branch) return branch.targetQuestionId;
  }

  const defaultEdge = outgoing.find((e) => e.sourceOptionValue === null);
  return defaultEdge ? defaultEdge.targetQuestionId : null;
}

/**
 * How many questions are still ahead, counting the current one — the longest
 * path left, since which branch the person will take isn't known yet.
 */
function questionsLeft(
  questionId: string,
  edges: FlowEdge[],
  seen: Set<string> = new Set(),
): number {
  if (seen.has(questionId)) return 0; // guard against a cycle in the graph
  seen.add(questionId);

  const outgoing = edges.filter((e) => e.sourceQuestionId === questionId);
  const longestAhead = outgoing.reduce(
    (max, edge) => Math.max(max, questionsLeft(edge.targetQuestionId, edges, new Set(seen))),
    0,
  );
  return 1 + longestAhead;
}

/**
 * Progress through the survey as a 0-100 percentage. With conditional branches
 * there's no fixed question count, so this compares what's been answered
 * against the longest route still ahead. Answering always moves it forward,
 * and it only reaches 100% once the survey is actually finished.
 */
export function computeProgress(
  currentQuestionId: string | null,
  answeredCount: number,
  edges: FlowEdge[],
): number {
  if (!currentQuestionId) return 100;

  const remaining = questionsLeft(currentQuestionId, edges);
  const total = answeredCount + remaining;
  if (total === 0) return 0;

  return Math.round((answeredCount / total) * 100);
}

/** Current position and estimated total for a question-count progress label. */
export function computeQuestionProgress(
  currentQuestionId: string | null,
  answeredCount: number,
  edges: FlowEdge[],
): { current: number; total: number } {
  if (!currentQuestionId) {
    return { current: answeredCount, total: answeredCount };
  }

  const remaining = questionsLeft(currentQuestionId, edges);
  return {
    current: answeredCount + 1,
    total: answeredCount + remaining,
  };
}

export type AnswerAction = "end" | "disqualify";

/**
 * Special destination chosen by the answer: an option marked "Descalificar" wins over
 * one marked "Fin de la encuesta"; null means follow the normal edges.
 */
export function resolveAnswerAction(
  options: { value: string; action?: AnswerAction }[],
  answer: AnswerValue | undefined,
): AnswerAction | null {
  if (answer === undefined) return null;
  const matched = options.filter(
    (option) => option.action && answerMatchesOption(answer, option.value),
  );
  if (matched.some((option) => option.action === "disqualify")) return "disqualify";
  if (matched.length > 0) return "end";
  return null;
}

/**
 * First question of the survey. Trusts the `isRoot` flag only when nothing points at that
 * question; otherwise takes the oldest question no edge leads to (the canvas starts there too),
 * and as a last resort the oldest question. `questions` must come ordered by creation.
 */
export function findRootQuestion<Q extends { id: string; isRoot: boolean }>(
  questions: Q[],
  edges: { targetQuestionId: string }[],
): Q | null {
  const targeted = new Set(edges.map((edge) => edge.targetQuestionId));
  return (
    questions.find((question) => question.isRoot && !targeted.has(question.id)) ??
    questions.find((question) => !targeted.has(question.id)) ??
    questions[0] ??
    null
  );
}
