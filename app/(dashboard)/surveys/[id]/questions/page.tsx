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
  parseProgressDisplay,
  parseSurfaceStyle,
  parseThemePreset,
} from "@/lib/survey-design";
import { Canvas } from "@/components/canvas/Canvas";

export default async function SurveyQuestionsPage({
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
    positionX: q.positionX,
    positionY: q.positionY,
    isRoot: q.isRoot,
    required: q.required,
    scoringEnabled: q.scoringEnabled,
    minSelections: q.minSelections,
    maxSelections: q.maxSelections,
    selectionErrorMessage: q.selectionErrorMessage,
  }));

  const edges = survey.edges.map((e) => ({
    id: e.id,
    sourceQuestionId: e.sourceQuestionId,
    targetQuestionId: e.targetQuestionId,
    sourceOptionValue: e.sourceOptionValue,
  }));

  return (
    <div className="h-full p-4">
      <div className="h-full overflow-hidden rounded-lg border">
        <Canvas
          surveyId={survey.id}
          title={survey.title}
          description={survey.description}
          status={survey.status}
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
            welcomeEnabled: survey.welcomeEnabled,
            welcomeTitle: survey.welcomeTitle,
            welcomeText: survey.welcomeText,
            welcomeButtonLabel: survey.welcomeButtonLabel,
            thankYouTitle: survey.thankYouTitle,
            thankYouText: survey.thankYouText,
          }}
          questions={questions}
          edges={edges}
        />
      </div>
    </div>
  );
}
