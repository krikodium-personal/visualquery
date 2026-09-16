import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurveyStatusPill } from "@/components/surveys/SurveyStatusPill";
import { NewSurveyForm } from "./new-survey-form";
import { SurveyRowActions } from "./survey-row-actions";

export default async function DashboardPage() {
  const session = await auth();
  const surveys = await prisma.survey.findMany({
    where: { ownerId: session!.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { responses: true, questions: true } } },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tus encuestas</h1>
          <p className="text-muted-foreground">Creá una nueva o seguí editando una existente.</p>
        </div>
        <NewSurveyForm />
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Todavía no creaste ninguna encuesta.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="border-[#EDE9DE] shadow-[0_0_20px_0_rgb(78_67_37_/_12%)]">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <CardTitle className="min-w-0 flex-1 line-clamp-1 font-bold">
                  {survey.title}
                </CardTitle>
                <SurveyStatusPill
                  surveyId={survey.id}
                  status={survey.status}
                  className="shrink-0"
                />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {survey._count.questions} preguntas · {survey._count.responses} respuestas
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    nativeButton={false}
                    render={<Link href={`/surveys/${survey.id}/questions`}>Editar</Link>}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    nativeButton={false}
                    render={<Link href={`/surveys/${survey.id}/results`}>Resultados</Link>}
                  />
                </div>
                <SurveyRowActions surveyId={survey.id} status={survey.status} slug={survey.slug} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
