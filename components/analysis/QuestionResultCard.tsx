"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  QuestionResultChart,
  RatingSummaryView,
  ResultsDataTable,
} from "@/components/charts/QuestionResultChart";
import { ViewAsMenu } from "@/components/analysis/ViewAsMenu";
import {
  answersForQuestion,
  averageOf,
  buildChoiceRows,
  buildRatingRows,
  buildSliderRows,
  buildTrendPoints,
  defaultViewForType,
  isAverageType,
  isChoiceType,
  isStarRatingType,
  RATING_MAX,
  viewsForType,
  type AnalysisAnswerValue,
  type AnalysisQuestion,
  type AnalysisResponse,
  type ChartViewMode,
  type CountRow,
} from "@/lib/analysis";

export function QuestionResultCard({
  question,
  responses,
}: {
  question: AnalysisQuestion;
  responses: AnalysisResponse[];
}) {
  const availableViews = viewsForType(question.type);
  const [view, setView] = useState<ChartViewMode>(defaultViewForType(question.type));
  const [showTable, setShowTable] = useState(isChoiceType(question.type));

  const answers = useMemo(
    () => answersForQuestion(responses, question.id),
    [responses, question.id],
  );

  const distributionRows: CountRow[] = useMemo(() => {
    if (isChoiceType(question.type)) return buildChoiceRows(question.options, answers);
    if (isStarRatingType(question.type)) return buildRatingRows(answers, RATING_MAX);
    if (question.type === "slider") return buildSliderRows(answers);
    return [];
  }, [question, answers]);

  const average = useMemo(() => averageOf(answers), [answers]);
  const numericStats = useMemo(() => {
    const values = answers
      .map((answer) => (typeof answer === "number" ? answer : null))
      .filter((value): value is number => value !== null);
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  }, [answers]);

  const trendData = useMemo(
    () =>
      buildTrendPoints(
        responses,
        question.id,
        isAverageType(question.type) ? "average" : "count",
      ),
    [responses, question.id, question.type],
  );

  const activeView = availableViews.includes(view) ? view : availableViews[0];
  const chartRows =
    isStarRatingType(question.type) || question.type === "slider"
      ? [...distributionRows].reverse()
      : distributionRows;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-medium">
              Q{question.index}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {answers.length} respuesta{answers.length === 1 ? "" : "s"}
            </span>
          </div>
          {availableViews.length > 0 ? (
            <ViewAsMenu
              views={availableViews}
              value={activeView}
              onChange={setView}
              showTable={showTable}
              onShowTableChange={setShowTable}
            />
          ) : null}
        </div>
        <h3 className="text-base font-semibold leading-snug">{question.title}</h3>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {answers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay respuestas.</p>
        ) : isStarRatingType(question.type) ? (
          <>
            {activeView === "rating" && average !== null ? (
              <RatingSummaryView average={average} max={RATING_MAX} rows={distributionRows} />
            ) : (
              <QuestionResultChart
                data={chartRows}
                view={activeView === "rating" ? "bar_horizontal" : activeView}
                trendData={trendData}
              />
            )}
            {showTable ? <ResultsDataTable rows={distributionRows} /> : null}
          </>
        ) : question.type === "slider" ? (
          <>
            {activeView === "rating" && numericStats ? (
              <div className="flex flex-col gap-4">
                <RatingSummaryView
                  average={numericStats.average}
                  max={100}
                  rows={distributionRows}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="rounded-md bg-muted p-3 text-sm">
                    Mínimo
                    <br />
                    <strong className="text-lg">{numericStats.min}</strong>
                  </p>
                  <p className="rounded-md bg-muted p-3 text-sm">
                    Máximo
                    <br />
                    <strong className="text-lg">{numericStats.max}</strong>
                  </p>
                </div>
              </div>
            ) : (
              <QuestionResultChart
                data={chartRows}
                view={activeView === "rating" ? "bar_horizontal" : activeView}
                trendData={trendData}
              />
            )}
            {showTable ? <ResultsDataTable rows={distributionRows} /> : null}
          </>
        ) : isChoiceType(question.type) ? (
          <>
            <QuestionResultChart
              data={chartRows}
              view={activeView === "rating" ? "bar_vertical" : activeView}
              trendData={trendData}
            />
            {showTable ? <ResultsDataTable rows={distributionRows} /> : null}
          </>
        ) : (
          <TextResults answers={answers} options={question.options} />
        )}
      </CardContent>
    </Card>
  );
}

function TextResults({
  answers,
  options,
}: {
  answers: AnalysisAnswerValue[];
  options: { value: string; label: string }[];
}) {
  const labels = new Map(options.map((option) => [option.value, option.label]));
  const texts = answers
    .map((answer) => formatAnswer(answer, labels))
    .filter((answer) => answer !== "");

  if (texts.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay respuestas.</p>;
  }

  const shown = texts.slice(0, 10);
  return (
    <ul className="flex flex-col gap-2">
      {shown.map((text, index) => (
        <li key={`${text}-${index}`} className="rounded-md border px-3 py-2 text-sm">
          {text}
        </li>
      ))}
      {texts.length > shown.length ? (
        <p className="text-xs text-muted-foreground">y {texts.length - shown.length} más</p>
      ) : null}
    </ul>
  );
}

function formatAnswer(answer: AnalysisAnswerValue, labels: Map<string, string>): string {
  if (answer === null) return "";
  if (typeof answer === "string") return labels.get(answer) ?? answer;
  if (typeof answer === "number") return String(answer);
  if (Array.isArray(answer)) {
    return answer
      .map((value, index) => `${index + 1}. ${labels.get(value) ?? value}`)
      .join(" · ");
  }
  return Object.entries(answer)
    .map(([key, value]) => `${labels.get(key) ?? key}: ${labels.get(String(value)) ?? value}`)
    .join(" · ");
}
