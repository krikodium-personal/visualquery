import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      slug: true,
      status: true,
      accessPassword: true,
      responseLimit: true,
      cutoffAt: true,
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
        slug={survey.slug}
        status={survey.status}
        questionCount={survey._count.questions}
        publicUrl={`${proto}://${host}/s/${survey.slug}`}
        accessPassword={survey.accessPassword}
        responseLimit={survey.responseLimit}
        cutoffAt={survey.cutoffAt?.toISOString() ?? null}
      />
    </div>
  );
}
