import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptions } from "@/lib/question-options";
import {
  parseBackgroundImageScope,
  parseButtonShape,
  parseFontFamily,
  parseLogoPosition,
  parseProgressDisplay,
  parseSurfaceStyle,
  parseThemePreset,
} from "@/lib/survey-design";
import { DesignForm } from "@/components/surveys/DesignForm";

export default async function SurveyDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const survey = await prisma.survey.findFirst({
    where: { id, ownerId: session!.user.id },
    include: { questions: true, edges: true },
  });

  if (!survey) notFound();

  // The preview runs the real survey, so it needs the real questions.
  const questions = survey.questions.map((q) => ({
    id: q.id,
    title: q.title,
    type: q.type,
    options: parseOptions(q.options),
    required: q.required,
    minSelections: q.minSelections,
    maxSelections: q.maxSelections,
    selectionErrorMessage: q.selectionErrorMessage,
  }));

  const edges = survey.edges.map((e) => ({
    sourceQuestionId: e.sourceQuestionId,
    targetQuestionId: e.targetQuestionId,
    sourceOptionValue: e.sourceOptionValue,
  }));

  const rootQuestion = survey.questions.find((q) => q.isRoot) ?? survey.questions[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <DesignForm
        surveyId={survey.id}
        questions={questions}
        edges={edges}
        rootQuestionId={rootQuestion?.id ?? null}
        initial={{
          title: survey.title,
          description: survey.description,
          themePreset: parseThemePreset(survey.themePreset),
          themeColor: survey.themeColor,
          backgroundColor: survey.backgroundColor,
          backgroundImageUrl: survey.backgroundImageUrl,
          backgroundImageScope: parseBackgroundImageScope(survey.backgroundImageScope),
          fontFamily: parseFontFamily(survey.fontFamily),
          buttonShape: parseButtonShape(survey.buttonShape),
          surfaceStyle: parseSurfaceStyle(survey.surfaceStyle),
          logoUrl: survey.logoUrl,
          logoSize: survey.logoSize,
          logoPosition: parseLogoPosition(survey.logoPosition),
          showProgress: survey.showProgress,
          progressDisplay: parseProgressDisplay(survey.progressDisplay),
          welcomeEnabled: survey.welcomeEnabled,
          welcomeTitle: survey.welcomeTitle,
          welcomeText: survey.welcomeText,
          welcomeButtonLabel: survey.welcomeButtonLabel,
          thankYouTitle: survey.thankYouTitle,
          thankYouText: survey.thankYouText,
        }}
      />
    </div>
  );
}
