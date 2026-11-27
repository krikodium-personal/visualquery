import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollectorDetail } from "@/components/surveys/CollectorDetail";

export default async function CollectorPage({
  params,
}: {
  params: Promise<{ id: string; collectorId: string }>;
}) {
  const { id, collectorId } = await params;
  const session = await auth();

  const collector = await prisma.collector.findFirst({
    where: { id: collectorId, surveyId: id, survey: { ownerId: session!.user.id } },
    include: {
      survey: { select: { title: true, status: true } },
      _count: { select: { responses: true } },
    },
  });
  if (!collector) notFound();

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <CollectorDetail
        surveyId={id}
        surveyTitle={collector.survey.title}
        surveyOpen={collector.survey.status === "published"}
        origin={`${proto}://${host}`}
        collector={{
          id: collector.id,
          name: collector.name,
          slug: collector.slug,
          open: collector.status === "open",
          responseCount: collector._count.responses,
          accessPassword: collector.accessPassword,
          responseLimit: collector.responseLimit,
          cutoffAt: collector.cutoffAt?.toISOString() ?? null,
          endRedirectUrl: collector.endRedirectUrl,
          disqualifyMessage: collector.disqualifyMessage,
          disqualifyRedirectUrl: collector.disqualifyRedirectUrl,
        }}
      />
    </div>
  );
}
