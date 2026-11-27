import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findRootQuestion } from "@/lib/flow-engine";
import { prisma } from "@/lib/prisma";
import { parseCustomVariables, pickVariableValues } from "@/lib/custom-variables";
import { collectorClosedReason } from "@/lib/collectors";
import { fullQuotaValues } from "@/lib/quotas";
import { parseOptions } from "@/lib/question-options";
import {
  parseBackgroundImageScope,
  parseThankYouImageMode,
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collector = await prisma.collector.findUnique({
    where: { slug },
    select: {
      survey: {
        select: {
          status: true,
          title: true,
          description: true,
          shareTitle: true,
          shareDescription: true,
          shareImageUrl: true,
        },
      },
    },
  });
  const survey = collector?.survey;
  if (!survey || survey.status === "draft") return {};

  const title = survey.shareTitle || survey.title;
  const description = survey.shareDescription || survey.description || undefined;
  const images = survey.shareImageUrl ? [`/s/${slug}/share-image`] : undefined;
  // Absolute og:image URLs need a base; AUTH_URL is already the site's public origin.
  const origin = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  return {
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    title,
    description,
    openGraph: { title, description, type: "website", images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
  };
}

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const embed = Array.isArray(query.embed) ? query.embed[0] : query.embed;
  const isEmbed = embed === "1" || embed === "true";

  const collector = await prisma.collector.findUnique({
    where: { slug },
    include: {
      survey: { include: { questions: { orderBy: { createdAt: "asc" } }, edges: true } },
      _count: { select: { responses: true } },
    },
  });
  const survey = collector?.survey;

  if (!collector || !survey || survey.status === "draft") notFound();

  if (survey.status === "closed") {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">{survey.title}</h1>
        <p className="text-muted-foreground">Esta encuesta está cerrada y ya no acepta respuestas.</p>
      </main>
    );
  }

  const closedReason = collectorClosedReason(collector, collector._count.responses);
  if (closedReason) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">{survey.title}</h1>
        <p className="text-muted-foreground">{closedReason}</p>
      </main>
    );
  }

  const variables = pickVariableValues(parseCustomVariables(survey.customVariables), query);

  // Options whose quota is already filled stop being offered.
  const fullQuotas = new Map<string, Set<string>>();
  await Promise.all(
    survey.questions.map(async (q) => {
      const options = parseOptions(q.options);
      if (options.some((option) => option.quota !== undefined)) {
        fullQuotas.set(q.id, await fullQuotaValues(q.id, options));
      }
    }),
  );

  const questions = survey.questions.map((q) => ({
    id: q.id,
    title: q.title,
    type: q.type,
    options: parseOptions(q.options).filter((option) => !fullQuotas.get(q.id)?.has(option.value)),
    required: q.required,
    scoringEnabled: q.scoringEnabled,
    minSelections: q.minSelections,
    maxSelections: q.maxSelections,
    selectionErrorMessage: q.selectionErrorMessage,
    requiredErrorMessage: q.requiredErrorMessage,
    description: q.description,
    randomizeOptions: q.randomizeOptions,
    orderMode: q.orderMode,
    keepLastOption: q.keepLastOption,
  }));

  const edges = survey.edges.map((e) => ({
    sourceQuestionId: e.sourceQuestionId,
    targetQuestionId: e.targetQuestionId,
    sourceOptionValue: e.sourceOptionValue,
  }));

  const rootQuestion = findRootQuestion(survey.questions, survey.edges);

  return (
    <SurveyPasswordGate
      surveyId={collector.id}
      accessPassword={collector.accessPassword}
      title={survey.title}
    >
      <div className={`flex flex-col ${isEmbed ? "min-h-[640px]" : "min-h-svh"}`}>
        <SurveyRunner
          surveyId={survey.id}
          collectorId={collector.id}
          variables={variables}
          endRedirectUrl={collector.endRedirectUrl}
          disqualifyMessage={collector.disqualifyMessage}
          disqualifyRedirectUrl={collector.disqualifyRedirectUrl}
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
            thankYouImageUrl: survey.thankYouImageUrl,
            thankYouImageMode: parseThankYouImageMode(survey.thankYouImageMode),
          }}
        />
      </div>
    </SurveyPasswordGate>
  );
}
