import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptions } from "@/lib/question-options";
import { readAnswerValue, type AnalysisPayload } from "@/lib/analysis";
import { SurveyResultsAnalysis } from "@/components/analysis/SurveyResultsAnalysis";
import type { QuestionType } from "@/lib/question-types";

export default async function SurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const survey = await prisma.survey.findFirst({
    where: { id, ownerId: session!.user.id },
    include: {
      questions: { orderBy: { createdAt: "asc" } },
      responses: {
        include: { answers: true },
        orderBy: { startedAt: "asc" },
      },
    },
  });

  if (!survey) notFound();

  const data: AnalysisPayload = {
    surveyTitle: survey.title,
    questions: survey.questions.map((question, index) => ({
      id: question.id,
      title: question.title,
      type: question.type as QuestionType,
      options: parseOptions(question.options),
      index: index + 1,
    })),
    responses: survey.responses.map((response) => ({
      id: response.id,
      startedAt: response.startedAt.toISOString(),
      completedAt: response.completedAt?.toISOString() ?? null,
      answers: response.answers.map((answer) => ({
        questionId: answer.questionId,
        value: readAnswerValue(answer.value),
      })),
    })),
  };

  return <SurveyResultsAnalysis data={data} />;
}
