import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { NewSurveyForm } from "./new-survey-form";
import { SurveyCard } from "./survey-card";

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
            <SurveyCard
              key={survey.id}
              id={survey.id}
              title={survey.title}
              status={survey.status}
              slug={survey.slug}
              questionCount={survey._count.questions}
              responseCount={survey._count.responses}
            />
          ))}
        </div>
      )}
    </div>
  );
}
