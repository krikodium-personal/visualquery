import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptions } from "@/lib/question-options";
import {
  parseBackgroundImageScope,
  parseButtonShape,
  parseColorMode,
  parseFontFamily,
  parseLogoPosition,
  parseAdvanceMode,
  parseProgressDisplay,
  parseSurfaceStyle,
  parseThemePreset,
} from "@/lib/survey-design";
import { SurveyPreview } from "@/components/surveys/SurveyPreview";

export default async function SurveyPreviewPage({
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

  const questions = survey.questions.map((q) => ({
    id: q.id,
    title: q.title,
    type: q.type,
    options: parseOptions(q.options),
    isRoot: q.isRoot,
    required: q.required,
    scoringEnabled: q.scoringEnabled,
    minSelections: q.minSelections,
    maxSelections: q.maxSelections,
    selectionErrorMessage: q.selectionErrorMessage,
    requiredErrorMessage: q.requiredErrorMessage,
    randomizeOptions: q.randomizeOptions,
  }));

  const edges = survey.edges.map((e) => ({
    sourceQuestionId: e.sourceQuestionId,
    targetQuestionId: e.targetQuestionId,
    sourceOptionValue: e.sourceOptionValue,
  }));

  const rootQuestion = survey.questions.find((q) => q.isRoot) ?? survey.questions[0] ?? null;

  return (
    <SurveyPreview
      surveyId={survey.id}
      title={survey.title}
      description={survey.description}
      questions={questions}
      edges={edges}
      rootQuestionId={rootQuestion?.id ?? null}
      design={{
        themePreset: parseThemePreset(survey.themePreset),
        themeColor: survey.themeColor,
        backgroundColor: survey.backgroundColor,
        colorMode: parseColorMode(survey.colorMode),
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
        advanceMode: parseAdvanceMode(survey.advanceMode),
        welcomeEnabled: survey.welcomeEnabled,
        welcomeTitle: survey.welcomeTitle,
        welcomeText: survey.welcomeText,
        welcomeButtonLabel: survey.welcomeButtonLabel,
        thankYouTitle: survey.thankYouTitle,
        thankYouText: survey.thankYouText,
      }}
    />
  );
}
