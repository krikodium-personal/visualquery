import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SurveyEditorChrome } from "@/components/surveys/SurveyEditorChrome";

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
    <SurveyEditorChrome surveyId={survey.id} title={survey.title} status={survey.status}>
      {children}
    </SurveyEditorChrome>
  );
}
