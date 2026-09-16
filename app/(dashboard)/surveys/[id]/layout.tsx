import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SurveyStatusPill } from "@/components/surveys/SurveyStatusPill";
import { SurveySteps } from "@/components/surveys/SurveySteps";

export default async function SurveyLayout({
  children,
  params,
}: LayoutProps<"/surveys/[id]">) {
  const { id } = await params;
  const session = await auth();

  const survey = await prisma.survey.findFirst({
    where: { id, ownerId: session!.user.id },
    select: { id: true, title: true, status: true },
  });

  if (!survey) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            size="icon-sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">{survey.title}</h1>
          <SurveyStatusPill surveyId={survey.id} status={survey.status} />
        </div>
        <div className="pl-11">
          <SurveySteps surveyId={survey.id} />
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
