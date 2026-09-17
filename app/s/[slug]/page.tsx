import { notFound } from "next/navigation";
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
import { SurveyRunner } from "@/components/survey-runtime/SurveyRunner";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const survey = await prisma.survey.findFirst({
    where: { slug, status: { in: ["published", "closed"] } },
    include: { questions: true, edges: true },
  });

  if (!survey) notFound();

  if (survey.status === "closed") {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">{survey.title}</h1>
        <p className="text-muted-foreground">Esta encuesta está cerrada y ya no acepta respuestas.</p>
      </main>
    );
  }

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
    <div className="flex min-h-svh flex-col">
      <SurveyRunner
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
