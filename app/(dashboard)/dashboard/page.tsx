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
    include: {
      _count: { select: { responses: true } },
      // The dashboard links to the survey's first (oldest) public link.
      collectors: { orderBy: { createdAt: "asc" }, take: 1, select: { slug: true } },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
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
        <div className="rounded-lg border bg-background px-3 sm:px-4">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              id={survey.id}
              title={survey.title}
              status={survey.status}
              slug={survey.collectors[0]?.slug ?? survey.slug}
              responseCount={survey._count.responses}
              updatedAt={survey.updatedAt.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
