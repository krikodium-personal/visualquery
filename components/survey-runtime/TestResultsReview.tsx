"use client";

import { Check, X } from "lucide-react";
import type { AnswerValue } from "@/lib/flow-engine";
import type { QuestionOption } from "@/lib/question-options";
import {
  formatScorePercent,
  isScoredQuestion,
  optionReviewState,
  pointsFractionLabel,
  questionMaxPoints,
  scoreAnswer,
  scoreSurvey,
  selectedOptionValues,
  type OptionReviewState,
  type ScorableQuestion,
} from "@/lib/scoring";
import type { QuestionType } from "@/lib/question-types";
import { cn } from "@/lib/utils";

type ReviewQuestion = ScorableQuestion & {
  id: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
};

export function TestResultsReview({
  questions,
  answers,
}: {
  questions: ReviewQuestion[];
  answers: Record<string, AnswerValue | undefined>;
}) {
  const totals = scoreSurvey(questions, answers);
  if (!totals.hasScoring) return null;

  const scoredQuestions = questions.filter(isScoredQuestion);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-3xl font-bold tracking-tight text-emerald-600 sm:text-4xl">
          Puntuación: {formatScorePercent(totals.percent)}
        </p>
        <p className="mt-1 text-base text-muted-foreground tabular-nums">
          {pointsFractionLabel(totals.obtained, totals.max)}
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {scoredQuestions.map((question) => {
          const answer = answers[question.id];
          const obtained = scoreAnswer(question, answer);
          const max = questionMaxPoints(question);
          const selected = new Set(selectedOptionValues(question.type, answer));

          return (
            <section key={question.id} className="flex flex-col gap-3">
              <div>
                <h3 className="text-base font-semibold leading-snug">{question.title}</h3>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {pointsFractionLabel(obtained, max)}
                </p>
              </div>

              <ul className="flex flex-col gap-2">
                {question.options.map((option) => {
                  const state = optionReviewState(option, selected);
                  return (
                    <li key={option.value}>
                      <OptionReviewRow option={option} state={state} showImage={question.type === "image_choice"} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OptionReviewRow({
  option,
  state,
  showImage,
}: {
  option: QuestionOption;
  state: OptionReviewState;
  showImage: boolean;
}) {
  const highlight = state === "selected_correct" || state === "unselected_correct";
  const selectedIncorrect = state === "selected_incorrect";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md px-2 py-2",
        highlight && "bg-muted/70",
        selectedIncorrect && "bg-transparent",
      )}
    >
      <OptionMarker state={state} />
      <div className="min-w-0 flex-1">
        {showImage && option.imageUrl && (
          // Survey creator controls these external image URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.imageUrl}
            alt=""
            className="mb-2 aspect-video max-h-28 w-full rounded object-cover"
          />
        )}
        <p className="text-sm leading-snug">{option.label}</p>
      </div>
    </div>
  );
}

function OptionMarker({ state }: { state: OptionReviewState }) {
  if (state === "selected_correct") {
    return (
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[3px] bg-emerald-600 text-white"
        aria-label="Seleccionada correcta"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }

  if (state === "selected_incorrect") {
    return (
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[3px] bg-red-600 text-white"
        aria-label="Seleccionada incorrecta"
      >
        <X className="size-3.5" strokeWidth={3} />
      </span>
    );
  }

  // Correct but not selected, or plain incorrect unselected — empty square.
  // Correct unselected still sits on a highlighted row (parent).
  return (
    <span
      className="mt-0.5 size-5 shrink-0 rounded-[3px] border border-muted-foreground/45 bg-background"
      aria-label={state === "unselected_correct" ? "Correcta no seleccionada" : "No seleccionada"}
    />
  );
}
