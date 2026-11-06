"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  answersForQuestion,
  averageOf,
  buildChoiceRows,
  isAverageType,
  isChoiceType,
  type AnalysisQuestion,
  type AnalysisResponse,
} from "@/lib/analysis";
import {
  compareSegments,
  type CompareRule,
} from "@/lib/analysis-rules";

const GROUP_COLORS = [
  "hsl(152 55% 42%)",
  "hsl(210 70% 45%)",
  "hsl(25 70% 45%)",
  "hsl(280 40% 50%)",
  "hsl(0 65% 50%)",
  "hsl(45 75% 45%)",
];

/** Side-by-side breakdown by answer choices of one pivot question (SurveyMonkey Compare). */
export function CompareResults({
  questions,
  responses,
  compare,
}: {
  questions: AnalysisQuestion[];
  responses: AnalysisResponse[];
  compare: CompareRule;
}) {
  const segments = compareSegments(questions, responses, compare);
  if (segments.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Elegí al menos 2 opciones de una pregunta en Comparar.
        </CardContent>
      </Card>
    );
  }

  const pivot = questions.find((q) => q.id === compare.questionId);
  const comparable = questions.filter(
    (q) => q.id !== compare.questionId && (isChoiceType(q.type) || isAverageType(q.type)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
        Comparando por{" "}
        <span className="font-medium">
          {pivot ? `P${pivot.index}. ${pivot.title}` : "pregunta"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {segments.map((segment, index) => (
          <span key={segment.key} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: GROUP_COLORS[index % GROUP_COLORS.length] }}
            />
            {segment.label} ({segment.responses.length})
          </span>
        ))}
      </div>

      {comparable.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay otras preguntas cerradas para comparar.
          </CardContent>
        </Card>
      ) : (
        comparable.map((question) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Q{question.index}. {question.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAverageType(question.type) ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {segments.map((segment, index) => {
                    const avg = averageOf(answersForQuestion(segment.responses, question.id));
                    return (
                      <div
                        key={segment.key}
                        className="rounded-lg border px-3 py-3"
                        style={{ borderColor: GROUP_COLORS[index % GROUP_COLORS.length] }}
                      >
                        <p className="text-xs text-muted-foreground">{segment.label}</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                          {avg === null ? "—" : avg.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {segment.responses.length} resp.
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Opción</th>
                        {segments.map((segment, index) => (
                          <th key={segment.key} className="px-3 py-2 font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: GROUP_COLORS[index % GROUP_COLORS.length] }}
                              />
                              {segment.label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {question.options.map((option) => (
                        <tr key={option.value} className="border-b last:border-0">
                          <td className="px-3 py-2">{option.label}</td>
                          {segments.map((segment) => {
                            const rows = buildChoiceRows(
                              question.options,
                              answersForQuestion(segment.responses, question.id),
                            );
                            const row = rows.find((entry) => entry.key === option.value);
                            return (
                              <td
                                key={`${option.value}-${segment.key}`}
                                className="px-3 py-2 tabular-nums"
                              >
                                {row
                                  ? `${row.count} (${row.percentage.toLocaleString("es-AR", {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 1,
                                    })}%)`
                                  : "0"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
