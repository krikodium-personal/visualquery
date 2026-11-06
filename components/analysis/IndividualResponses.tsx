"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AnalysisAnswerValue,
  AnalysisQuestion,
  AnalysisResponse,
} from "@/lib/analysis";

export function IndividualResponses({
  questions,
  responses,
}: {
  questions: AnalysisQuestion[];
  responses: AnalysisResponse[];
}) {
  const ordered = useMemo(
    () =>
      [...responses].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    [responses],
  );
  const [index, setIndex] = useState(0);
  const current = ordered[index] ?? null;

  if (ordered.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No hay respuestas individuales para mostrar.
        </CardContent>
      </Card>
    );
  }

  const safeIndex = Math.min(index, ordered.length - 1);
  const response = ordered[safeIndex] ?? current!;
  const answersByQuestion = new Map(
    response.answers.map((answer) => [answer.questionId, answer.value]),
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Respuestas individuales</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {safeIndex + 1} de {ordered.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            disabled={safeIndex <= 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            aria-label="Respuesta anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            disabled={safeIndex >= ordered.length - 1}
            onClick={() => setIndex((value) => Math.min(ordered.length - 1, value + 1))}
            aria-label="Respuesta siguiente"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">
            {response.completedAt ? "Completada" : "Parcial"}
          </Badge>
          <span className="text-muted-foreground">
            Inicio: {formatDateTime(response.startedAt)}
          </span>
          {response.completedAt ? (
            <span className="text-muted-foreground">
              Fin: {formatDateTime(response.completedAt)}
            </span>
          ) : null}
        </div>

        <ul className="flex flex-col gap-3">
          {questions.map((question) => {
            const value = answersByQuestion.get(question.id) ?? null;
            return (
              <li key={question.id} className="rounded-lg border px-3 py-3">
                <p className="text-sm font-medium">
                  Q{question.index}. {question.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {value === null || value === ""
                    ? "Sin respuesta"
                    : formatAnswer(value, question)}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR");
  } catch {
    return iso;
  }
}

function formatAnswer(value: AnalysisAnswerValue, question: AnalysisQuestion): string {
  const labels = new Map(question.options.map((option) => [option.value, option.label]));
  if (value === null) return "Sin respuesta";
  if (typeof value === "string") return labels.get(value) ?? value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((entry) => labels.get(entry) ?? entry).join(" · ");
  return Object.entries(value)
    .map(([key, entry]) => `${labels.get(key) ?? key}: ${labels.get(String(entry)) ?? entry}`)
    .join(" · ");
}
