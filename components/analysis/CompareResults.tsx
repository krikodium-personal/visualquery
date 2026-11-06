"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  answersForQuestion,
  averageOf,
  buildChoiceRows,
  isAverageType,
  isChoiceType,
  filterResponses,
  type AnalysisQuestion,
  type AnalysisResponse,
} from "@/lib/analysis";
import type { CompareGroup } from "@/lib/analysis-views";

const GROUP_COLORS = [
  "hsl(152 55% 42%)",
  "hsl(210 70% 45%)",
  "hsl(25 70% 45%)",
  "hsl(280 40% 50%)",
  "hsl(0 65% 50%)",
  "hsl(45 75% 45%)",
];

export function CompareResults({
  questions,
  responses,
  groups,
}: {
  questions: AnalysisQuestion[];
  responses: AnalysisResponse[];
  groups: CompareGroup[];
}) {
  if (groups.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Definí al menos 2 grupos en Comparar para ver el desglose lado a lado.
        </CardContent>
      </Card>
    );
  }

  const groupResponses = groups.map((group) => ({
    group,
    responses: filterResponses(responses, group.filters),
  }));

  const comparable = questions.filter((q) => isChoiceType(q.type) || isAverageType(q.type));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {groups.map((group, index) => (
          <span key={group.id} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: GROUP_COLORS[index % GROUP_COLORS.length] }}
            />
            {group.name} ({groupResponses[index]?.responses.length ?? 0})
          </span>
        ))}
      </div>

      {comparable.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay preguntas comparables (opción o valoración).
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
                  {groupResponses.map(({ group, responses: subset }, index) => {
                    const avg = averageOf(answersForQuestion(subset, question.id));
                    return (
                      <div
                        key={group.id}
                        className="rounded-lg border px-3 py-3"
                        style={{ borderColor: GROUP_COLORS[index % GROUP_COLORS.length] }}
                      >
                        <p className="text-xs text-muted-foreground">{group.name}</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                          {avg === null ? "—" : avg.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{subset.length} resp.</p>
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
                        {groups.map((group, index) => (
                          <th key={group.id} className="px-3 py-2 font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="size-2 rounded-full"
                                style={{ background: GROUP_COLORS[index % GROUP_COLORS.length] }}
                              />
                              {group.name}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {question.options.map((option) => (
                        <tr key={option.value} className="border-b last:border-0">
                          <td className="px-3 py-2">{option.label}</td>
                          {groupResponses.map(({ group, responses: subset }) => {
                            const rows = buildChoiceRows(question.options, answersForQuestion(subset, question.id));
                            const row = rows.find((entry) => entry.key === option.value);
                            return (
                              <td key={`${option.value}-${group.id}`} className="px-3 py-2 tabular-nums">
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
