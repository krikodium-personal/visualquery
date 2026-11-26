import { prisma } from "@/lib/prisma";
import { answerMatchesOption, type AnswerValue } from "@/lib/flow-engine";
import type { QuestionOption } from "@/lib/question-options";

/**
 * Completed, non-disqualified responses that picked each quota'd option of a question.
 * `excludeResponseId` leaves out the respondent who is answering right now.
 */
export async function countQuotaUsage(
  questionId: string,
  options: QuestionOption[],
  excludeResponseId?: string,
): Promise<Map<string, number>> {
  const quotaOptions = options.filter((option) => option.quota !== undefined);
  const usage = new Map<string, number>(quotaOptions.map((option) => [option.value, 0]));
  if (quotaOptions.length === 0) return usage;

  const answers = await prisma.answer.findMany({
    where: {
      questionId,
      response: {
        completedAt: { not: null },
        disqualified: false,
        ...(excludeResponseId ? { id: { not: excludeResponseId } } : {}),
      },
    },
    select: { value: true },
  });

  for (const answer of answers) {
    for (const option of quotaOptions) {
      if (answerMatchesOption(answer.value as AnswerValue, option.value)) {
        usage.set(option.value, (usage.get(option.value) ?? 0) + 1);
      }
    }
  }
  return usage;
}

/** Option values whose quota is already filled. */
export async function fullQuotaValues(
  questionId: string,
  options: QuestionOption[],
  excludeResponseId?: string,
): Promise<Set<string>> {
  const usage = await countQuotaUsage(questionId, options, excludeResponseId);
  const full = new Set<string>();
  for (const option of options) {
    if (option.quota !== undefined && (usage.get(option.value) ?? 0) >= option.quota) {
      full.add(option.value);
    }
  }
  return full;
}
