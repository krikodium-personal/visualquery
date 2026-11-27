import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCustomVariables } from "@/lib/custom-variables";
import { PublishPanel } from "@/components/surveys/PublishPanel";

export default async function SurveyPublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const survey = await prisma.survey.findFirst({
    where: { id, ownerId: session!.user.id },
    select: {
      id: true,
      status: true,
      customVariables: true,
      title: true,
      shareTitle: true,
      shareDescription: true,
      shareImageUrl: true,
      collectors: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          responseLimit: true,
          createdAt: true,
          _count: { select: { responses: true } },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!survey) notFound();

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <PublishPanel
        surveyId={survey.id}
        status={survey.status}
        questionCount={survey._count.questions}
        origin={`${proto}://${host}`}
        collectors={survey.collectors.map((collector) => ({
          id: collector.id,
          name: collector.name,
          slug: collector.slug,
          open: collector.status === "open",
          responseCount: collector._count.responses,
          responseLimit: collector.responseLimit,
          createdAt: collector.createdAt.toISOString(),
        }))}
        customVariables={parseCustomVariables(survey.customVariables)}
        surveyTitle={survey.title}
        sharing={{
          shareTitle: survey.shareTitle,
          shareDescription: survey.shareDescription,
          shareImageUrl: survey.shareImageUrl,
        }}
      />
    </div>
  );
}
