import { z } from "zod";

/** Question types the generator may use (the ones that need no special option structure). */
export const AI_QUESTION_TYPES = [
  "single_choice",
  "multi_choice",
  "dropdown",
  "rating",
  "slider",
  "ranking",
  "text",
  "short_text",
  "name",
  "email",
  "phone",
  "datetime",
] as const;

/** Types whose answer options can lead to different questions. */
export const AI_BRANCHABLE_TYPES = ["single_choice", "multi_choice", "dropdown"] as const;
/** Types that carry a list of options. */
export const AI_OPTION_TYPES = ["single_choice", "multi_choice", "dropdown", "ranking"] as const;

export const END = "END";
export const DISQUALIFY = "DISQUALIFY";

export const MAX_AI_QUESTIONS = 30;
export const MAX_AI_OPTIONS = 12;
export const MAX_AI_GROUPS = 8;

export const aiQuestionSchema = z.object({
  key: z.string().describe("Unique short id for this question, e.g. q1, q2, q3."),
  title: z.string().describe("The question as the respondent reads it."),
  description: z.string().nullable().describe("Optional help text shown under the question, or null."),
  type: z.enum(AI_QUESTION_TYPES),
  required: z.boolean(),
  options: z
    .array(z.string())
    .describe("Answer options in order. Only for single_choice, multi_choice, dropdown and ranking; otherwise an empty array."),
  group: z
    .string()
    .nullable()
    .describe("Name of the block this question belongs to (e.g. 'Datos personales'), or null."),
  next: z
    .string()
    .describe("Key of the question that follows by default, or END if the survey finishes after this question."),
  branches: z
    .array(
      z.object({
        option: z.string().describe("Exact text of one of this question's options."),
        goto: z.string().describe("Key of the question this answer leads to, END, or DISQUALIFY."),
      }),
    )
    .describe("Answers that go somewhere other than `next`. Only for single_choice, multi_choice and dropdown; otherwise empty."),
});

export const aiSurveySchema = z.object({
  title: z.string().describe("Short survey title."),
  description: z.string().nullable().describe("One or two sentences introducing the survey to respondents, or null."),
  firstQuestion: z.string().describe("Key of the first question."),
  questions: z.array(aiQuestionSchema),
});

export type AiSurvey = z.infer<typeof aiSurveySchema>;
export type AiQuestion = z.infer<typeof aiQuestionSchema>;

/**
 * Checks what the model cannot be trusted to get right on its own: references that point nowhere,
 * options that do not exist, questions nobody can reach and loops. Returns human-readable problems
 * (also sent back to the model for one repair attempt).
 */
export function validateAiSurvey(survey: AiSurvey): string[] {
  const problems: string[] = [];
  const byKey = new Map<string, AiQuestion>();

  if (survey.questions.length === 0) problems.push("The survey has no questions.");
  if (survey.questions.length > MAX_AI_QUESTIONS) problems.push(`Use at most ${MAX_AI_QUESTIONS} questions.`);

  for (const q of survey.questions) {
    if (byKey.has(q.key)) problems.push(`Duplicate question key "${q.key}".`);
    byKey.set(q.key, q);
  }

  const isTarget = (value: string) => value === END || byKey.has(value);

  if (!byKey.has(survey.firstQuestion)) problems.push(`firstQuestion "${survey.firstQuestion}" is not a question key.`);

  for (const q of survey.questions) {
    const needsOptions = (AI_OPTION_TYPES as readonly string[]).includes(q.type);
    const branchable = (AI_BRANCHABLE_TYPES as readonly string[]).includes(q.type);
    if (!q.title.trim()) problems.push(`Question "${q.key}" has an empty title.`);
    if (needsOptions && (q.options.length < 2 || q.options.length > MAX_AI_OPTIONS)) {
      problems.push(`Question "${q.key}" (${q.type}) needs between 2 and ${MAX_AI_OPTIONS} options.`);
    }
    if (needsOptions && new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) {
      problems.push(`Question "${q.key}" has repeated options.`);
    }
    if (!needsOptions && q.options.length > 0) problems.push(`Question "${q.key}" (${q.type}) must have no options.`);
    if (!isTarget(q.next)) problems.push(`Question "${q.key}": next "${q.next}" is not a question key or END.`);
    if (!branchable && q.branches.length > 0) {
      problems.push(`Question "${q.key}" (${q.type}) cannot have branches; only single_choice, multi_choice and dropdown can.`);
    }
    const seenOptions = new Set<string>();
    for (const branch of q.branches) {
      if (!q.options.includes(branch.option)) {
        problems.push(`Question "${q.key}": branch option "${branch.option}" is not one of its options (copy the text exactly).`);
      }
      if (seenOptions.has(branch.option)) problems.push(`Question "${q.key}": option "${branch.option}" has two branches.`);
      seenOptions.add(branch.option);
      if (branch.goto !== DISQUALIFY && !isTarget(branch.goto)) {
        problems.push(`Question "${q.key}": branch goto "${branch.goto}" is not a question key, END or DISQUALIFY.`);
      }
    }
  }

  if (problems.length > 0) return problems;

  // Reachability and loops, following default and branch edges.
  const successors = (q: AiQuestion) =>
    [q.next, ...q.branches.map((b) => b.goto)].filter((target) => byKey.has(target));
  const reachable = new Set<string>();
  const stack = [survey.firstQuestion];
  while (stack.length > 0) {
    const key = stack.pop()!;
    if (reachable.has(key)) continue;
    reachable.add(key);
    for (const next of successors(byKey.get(key)!)) stack.push(next);
  }
  for (const q of survey.questions) {
    if (!reachable.has(q.key)) problems.push(`Question "${q.key}" can never be reached from the first question.`);
  }

  const state = new Map<string, 1 | 2>(); // 1 = on the current path, 2 = done
  const visit = (key: string): boolean => {
    if (state.get(key) === 2) return false;
    if (state.get(key) === 1) return true;
    state.set(key, 1);
    for (const next of successors(byKey.get(key)!)) if (visit(next)) return true;
    state.set(key, 2);
    return false;
  };
  if (visit(survey.firstQuestion)) problems.push("The flow contains a loop: a question leads back to an earlier one.");

  return problems;
}
