import { notFound } from "next/navigation";
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
import { SurveyRunner } from "@/components/survey-runtime/SurveyRunner";
import { SurveyPasswordGate } from "@/components/surveys/SurveyPasswordGate";

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1" || embed === "true";

  const survey = await prisma.survey.findFirst({
    where: { slug, status: { in: ["published", "closed"] } },
    include: {
      questions: true,
      edges: true,
      _count: { select: { responses: true } },
    },
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

  const pastCutoff = survey.cutoffAt !== null && survey.cutoffAt.getTime() <= Date.now();
  const atLimit =
    survey.responseLimit !== null && survey._count.responses >= survey.responseLimit;

  if (pastCutoff || atLimit) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">{survey.title}</h1>
        <p className="text-muted-foreground">
          {pastCutoff
            ? "Esta encuesta ya alcanzó su fecha de cierre."
            : "Esta encuesta alcanzó el límite de respuestas."}
        </p>
      </main>
    );
  }

  const questions = survey.questions.map((q) => ({
    id: q.id,
    title: q.title,
    type: q.type,
    options: parseOptions(q.options),
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
    <SurveyPasswordGate
      surveyId={survey.id}
      accessPassword={survey.accessPassword}
      title={survey.title}
    >
      <div className={`flex flex-col ${isEmbed ? "min-h-[640px]" : "min-h-svh"}`}>
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
      </div>
    </SurveyPasswordGate>
  );
}
