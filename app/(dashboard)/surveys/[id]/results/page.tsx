import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOptions } from "@/lib/question-options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuestionResultChart } from "@/components/charts/QuestionResultChart";

type ResultValue = string | string[] | number | Record<string, string | number> | null;

function readAnswerValue(value: unknown): ResultValue {
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number",
      ),
    );
  }
  return null;
}

export default async function SurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const survey = await prisma.survey.findFirst({
    where: { id, ownerId: session!.user.id },
    include: {
      questions: { orderBy: { createdAt: "asc" } },
      responses: { include: { answers: true } },
    },
  });

  if (!survey) notFound();

  const totalResponses = survey.responses.length;
  const completedResponses = survey.responses.filter((r) => r.completedAt).length;
  const completionRate =
    totalResponses === 0 ? 0 : Math.round((completedResponses / totalResponses) * 100);

  const allAnswers = survey.responses.flatMap((r) => r.answers);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Respuestas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalResponses}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{completedResponses}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de finalización
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{completionRate}%</CardContent>
        </Card>
      </div>

      {survey.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Esta encuesta todavía no tiene preguntas.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {survey.questions.map((question) => {
            const options = parseOptions(question.options);
            const questionAnswers = allAnswers.filter((a) => a.questionId === question.id);

            return (
              <Card key={question.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">{question.title}</CardTitle>
                  <Badge variant="secondary">{questionAnswers.length} respuestas</Badge>
                </CardHeader>
                <CardContent>
                  {["single_choice", "multi_choice", "dropdown", "image_choice"].includes(question.type) ? (
                    <ChoiceResults options={options} answers={questionAnswers.map((a) => readAnswerValue(a.value))} />
                  ) : question.type === "rating" ? (
                    <RatingResults answers={questionAnswers.map((a) => readAnswerValue(a.value))} max={5} />
                  ) : question.type === "slider" ? (
                    <SliderResults answers={questionAnswers.map((a) => readAnswerValue(a.value))} />
                  ) : (
                    <TextResults answers={questionAnswers.map((a) => readAnswerValue(a.value))} options={options} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChoiceResults({
  options,
  answers,
}: {
  options: { value: string; label: string }[];
  answers: ResultValue[];
}) {
  const counts = new Map(options.map((o) => [o.value, 0]));

  for (const answer of answers) {
    const values = Array.isArray(answer) ? answer : answer !== null ? [String(answer)] : [];
    for (const v of values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }

  const data = options.map((o) => ({ label: o.label, count: counts.get(o.value) ?? 0 }));

  if (answers.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay respuestas.</p>;
  }

  return <QuestionResultChart data={data} />;
}

function RatingResults({ answers, max }: { answers: ResultValue[]; max: number }) {
  const values = answers
    .map((a) => (typeof a === "number" ? a : null))
    .filter((v): v is number => v !== null);

  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay respuestas.</p>;
  }

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const data = Array.from({ length: max + (max === 10 ? 1 : 0) }, (_, index) => index + (max === 10 ? 0 : 1)).map((n) => ({
    label: String(n),
    count: values.filter((v) => v === n).length,
  }));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Promedio: {average.toFixed(1)} / {max}</p>
      <QuestionResultChart data={data} />
    </div>
  );
}

function SliderResults({ answers }: { answers: ResultValue[] }) {
  const values = answers.filter((answer): answer is number => typeof answer === "number");
  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay respuestas.</p>;
  }
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <p className="rounded-md bg-muted p-3 text-sm">Promedio<br /><strong className="text-lg">{average.toFixed(1)}</strong></p>
      <p className="rounded-md bg-muted p-3 text-sm">Mínimo<br /><strong className="text-lg">{Math.min(...values)}</strong></p>
      <p className="rounded-md bg-muted p-3 text-sm">Máximo<br /><strong className="text-lg">{Math.max(...values)}</strong></p>
    </div>
  );
}

function TextResults({ answers, options }: { answers: ResultValue[]; options: { value: string; label: string }[] }) {
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const texts = answers.map((answer) => formatAnswer(answer, labels)).filter((answer) => answer !== "");

  if (texts.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay respuestas.</p>;
  }

  const shown = texts.slice(0, 10);

  return (
    <ul className="flex flex-col gap-2">
      {shown.map((text, i) => (
        <li key={i} className="rounded-md border px-3 py-2 text-sm">
          {text}
        </li>
      ))}
      {texts.length > shown.length && (
        <p className="text-xs text-muted-foreground">y {texts.length - shown.length} más</p>
      )}
    </ul>
  );
}

function formatAnswer(answer: ResultValue, labels: Map<string, string>): string {
  if (answer === null) return "";
  if (typeof answer === "string") return labels.get(answer) ?? answer;
  if (typeof answer === "number") return String(answer);
  if (Array.isArray(answer)) return answer.map((value, index) => `${index + 1}. ${labels.get(value) ?? value}`).join(" · ");
  return Object.entries(answer)
    .map(([key, value]) => `${labels.get(key) ?? key}: ${labels.get(String(value)) ?? value}`)
    .join(" · ");
}
