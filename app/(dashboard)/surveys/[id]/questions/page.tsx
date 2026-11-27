import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptions } from "@/lib/question-options";
import { parseGroupColor } from "@/lib/question-groups";
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
  surveyOptionsOf,
} from "@/lib/survey-design";
import { Canvas } from "@/components/canvas/Canvas";

export default async function SurveyQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const autoAlign = (await searchParams).align === "1";
  const session = await auth();

  const survey = await prisma.survey.findFirst({
    where: { id, ownerId: session!.user.id },
    include: {
      questions: true,
      edges: true,
      questionGroups: { orderBy: { createdAt: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, email: true } } },
      },
    },
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
    requiredErrorMessage: q.requiredErrorMessage,
    description: q.description,
    randomizeOptions: q.randomizeOptions,
    orderMode: q.orderMode,
    keepLastOption: q.keepLastOption,
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
          initialGroups={survey.questionGroups.map((g) => ({ id: g.id, name: g.name, color: parseGroupColor(g.color) }))}
          initialMembership={Object.fromEntries(
            survey.questions.flatMap((q) => (q.groupId ? [[q.id, q.groupId]] : [])),
          )}
          autoAlign={autoAlign}
          options={surveyOptionsOf(survey)}
          initialComments={survey.comments.map((c) => ({
            id: c.id,
            questionId: c.questionId,
            parentId: c.parentId,
            authorId: c.authorId,
            authorName: c.author.name || c.author.email,
            body: c.body,
            resolved: c.resolvedAt !== null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          }))}
          currentUserId={session!.user.id}
          questions={questions}
          edges={edges}
        />
      </div>
    </div>
  );
}
