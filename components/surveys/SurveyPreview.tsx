"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Smartphone,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SurveyRunner,
  type SurveyPreviewState,
} from "@/components/survey-runtime/SurveyRunner";
import type { QuestionOption } from "@/lib/question-options";
import { isRatingLevel, isRatingMeta } from "@/lib/rating-options";
import { type AnswerValue, type FlowEdge } from "@/lib/flow-engine";
import { computeQuestionCodes } from "@/lib/question-codes";
import type { SurveyDesign } from "@/lib/survey-design";
import type { QuestionType } from "@/lib/question-types";
import { cn } from "@/lib/utils";

type PreviewQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  isRoot: boolean;
  required: boolean;
  scoringEnabled: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
  requiredErrorMessage: string | null;
  randomizeOptions: boolean;
};

type OverviewQuestion = PreviewQuestion & { code: string };

type Device = "desktop" | "tablet" | "phone";

const DEVICE_OPTIONS: {
  id: Device;
  label: string;
  icon: typeof Monitor;
  maxWidth: number | null;
}[] = [
  { id: "desktop", label: "Escritorio", icon: Monitor, maxWidth: null },
  { id: "tablet", label: "Tablet", icon: Tablet, maxWidth: 768 },
  { id: "phone", label: "Teléfono", icon: Smartphone, maxWidth: 390 },
];

/** Same codes + sort as the canvas Preguntas navigator. */
function overviewQuestions(
  questions: PreviewQuestion[],
  edges: FlowEdge[],
): OverviewQuestion[] {
  const codes = computeQuestionCodes(
    questions.map((question) => ({
      id: question.id,
      isRoot: question.isRoot,
      options: question.options,
    })),
    edges,
  );

  return [...questions]
    .map((question) => ({
      ...question,
      code: codes.get(question.id) ?? "?",
    }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

function overviewOptions(question: PreviewQuestion): QuestionOption[] {
  if (question.type === "rating") {
    return question.options.filter(
      (option) => isRatingLevel(option) || option.kind === "other" || option.kind === "none",
    );
  }
  return question.options.filter((option) => !isRatingMeta(option) && option.kind !== "row");
}

function answerMatches(answer: AnswerValue | undefined, optionValue: string): boolean {
  if (answer === undefined || answer === null || answer === "") return false;
  if (Array.isArray(answer)) return answer.includes(optionValue);
  if (typeof answer === "object") {
    return Object.values(answer).some((value) => String(value) === optionValue);
  }
  return String(answer) === optionValue;
}

function estimateMinutes(questionCount: number): number {
  return Math.max(1, Math.round(questionCount * 0.7));
}

function estimateCompletionPct(questionCount: number): number {
  return Math.max(55, Math.min(95, 96 - questionCount * 2));
}

export function SurveyPreview({
  surveyId,
  title,
  description,
  questions,
  edges,
  rootQuestionId,
  design,
}: {
  surveyId: string;
  title: string;
  description: string | null;
  questions: PreviewQuestion[];
  edges: FlowEdge[];
  rootQuestionId: string | null;
  design: SurveyDesign;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pageExpanded, setPageExpanded] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const [previewState, setPreviewState] = useState<SurveyPreviewState>({
    currentQuestionId: rootQuestionId,
    answers: {},
    draft: "",
    started: !design.welcomeEnabled,
    finished: false,
  });

  const orderedQuestions = useMemo(
    () => overviewQuestions(questions, edges),
    [questions, edges],
  );

  const hasRandomize = questions.some((question) => question.randomizeOptions);
  const readyToSend = questions.length > 0;
  const minutes = estimateMinutes(questions.length);
  const completionPct = estimateCompletionPct(questions.length);

  const frameMaxWidth = useMemo(
    () => DEVICE_OPTIONS.find((option) => option.id === device)?.maxWidth ?? null,
    [device],
  );

  const handlePreviewState = useCallback((state: SurveyPreviewState) => {
    setPreviewState(state);
  }, []);

  useEffect(() => {
    const questionId = previewState.currentQuestionId;
    if (!questionId || !sidebarOpen) return;
    if (!pageExpanded) {
      setPageExpanded(true);
      return;
    }
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`checa-overview-q-${questionId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [previewState.currentQuestionId, sidebarOpen, pageExpanded]);

  function answerForQuestion(questionId: string): AnswerValue | undefined {
    if (previewState.answers[questionId] !== undefined) {
      return previewState.answers[questionId];
    }
    if (previewState.currentQuestionId === questionId) return previewState.draft;
    return undefined;
  }

  async function handleShare() {
    const url = `${window.location.origin}/surveys/${surveyId}/preview`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de vista previa copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col bg-background text-foreground">
      {/* Top bar — SurveyMonkey-style dark chrome */}
      <header className="flex shrink-0 items-center gap-3 bg-zinc-900 px-4 py-3 text-zinc-50">
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{title}</h1>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-zinc-50 hover:bg-zinc-800 hover:text-zinc-50"
          aria-label="Comentarios"
          title="Comentarios"
          onClick={() => toast.message("Los comentarios llegan pronto")}
        >
          <MessageSquare className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-zinc-500 bg-transparent text-zinc-50 hover:bg-zinc-800 hover:text-zinc-50"
          onClick={handleShare}
        >
          <Share2 className="size-3.5" />
          Compartir
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left overview sidebar */}
        {sidebarOpen ? (
          <aside className="flex w-[300px] shrink-0 flex-col border-r bg-background sm:w-[320px]">
            <div className="flex items-start justify-between gap-2 border-b px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">
                  Descripción general de la encuesta
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Se muestran todas las páginas</p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Ocultar descripción general"
                onClick={() => setSidebarOpen(false)}
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              {hasRandomize ? (
                <div className="mb-3 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
                  Se aplicó distribución aleatoria a una o más preguntas.
                </div>
              ) : null}

              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-sm font-semibold hover:bg-muted"
                onClick={() => setPageExpanded((open) => !open)}
              >
                {pageExpanded ? (
                  <ChevronDown className="size-4 shrink-0 opacity-70" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 opacity-70" />
                )}
                <span className="min-w-0 truncate">
                  Página 1
                  {design.welcomeTitle ? `: ${design.welcomeTitle}` : title ? `: ${title}` : ""}
                </span>
              </button>

              {pageExpanded ? (
                <ul className="mt-1 space-y-2 pb-4">
                  {orderedQuestions.map((question) => {
                    const options = overviewOptions(question);
                    const isCurrent = previewState.currentQuestionId === question.id;
                    const selected = answerForQuestion(question.id);

                    return (
                      <li
                        key={question.id}
                        id={`checa-overview-q-${question.id}`}
                        className="pl-2"
                      >
                        <div
                          className={cn(
                            "rounded-md px-2 py-1.5 text-sm",
                            isCurrent && "bg-muted font-medium",
                          )}
                        >
                          <p className="leading-snug">
                            <span className="text-muted-foreground">P{question.code}:</span>{" "}
                            {question.title}
                          </p>
                        </div>
                        {options.length > 0 ? (
                          <ul className="mt-1 space-y-0.5 border-l border-border/70 ml-3 pl-2">
                            {options.map((option, optionIndex) => {
                              const selectedMatch = answerMatches(selected, option.value);
                              return (
                                <li
                                  key={`${question.id}-${option.value}`}
                                  className={cn(
                                    "flex items-start gap-1.5 rounded-sm px-1.5 py-1 text-xs",
                                    selectedMatch &&
                                      "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100",
                                  )}
                                >
                                  <span className="shrink-0 font-medium text-muted-foreground">
                                    R{optionIndex + 1}
                                  </span>
                                  <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
                                  {selectedMatch ? (
                                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="mt-1 ml-3 pl-2 text-xs text-muted-foreground">
                            Respuesta abierta
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </aside>
        ) : (
          <div className="flex shrink-0 flex-col border-r bg-background px-1 py-2">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Mostrar descripción general"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          </div>
        )}

        {/* Center respondent preview */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-900/40">
          <div className="flex min-h-full justify-center p-4 sm:p-8">
            <div
              className={cn(
                "flex w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm transition-[max-width] duration-200",
                frameMaxWidth ? "w-full" : "max-w-3xl",
              )}
              style={frameMaxWidth ? { maxWidth: frameMaxWidth } : undefined}
            >
              <div key={runKey} className="flex min-h-[640px] flex-1 flex-col">
                <SurveyRunner
                  preview
                  title={title}
                  description={description}
                  questions={questions}
                  edges={edges}
                  rootQuestionId={rootQuestionId}
                  design={design}
                  onPreviewStateChange={handlePreviewState}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status / actions bar */}
      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t bg-background px-3 py-2.5 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              readyToSend
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                : "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
            )}
          >
            {readyToSend ? <Check className="size-3.5" /> : null}
            {readyToSend ? "Lista para enviar" : "Sin preguntas"}
          </span>
          <p className="min-w-0 text-xs text-muted-foreground sm:text-sm">
            Alrededor del {completionPct}% de los encuestados terminarán la encuesta. Tomará
            alrededor de {minutes} {minutes === 1 ? "minuto" : "minutos"}.
          </p>
        </div>

        <div
          className="flex items-center rounded-lg border bg-background p-0.5"
          role="group"
          aria-label="Dispositivo de vista previa"
        >
          {DEVICE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              size="icon-sm"
              variant={device === id ? "secondary" : "ghost"}
              className={cn(device === id && "text-emerald-800 dark:text-emerald-200")}
              aria-label={label}
              aria-pressed={device === id}
              title={label}
              onClick={() => setDevice(id)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRunKey((key) => key + 1)}
            className="hidden sm:inline-flex"
          >
            Reiniciar
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/surveys/${surveyId}/questions`} />}
          >
            Editar encuesta
          </Button>
          <Button
            size="sm"
            className="bg-emerald-700 text-white hover:bg-emerald-800"
            nativeButton={false}
            render={<Link href={`/surveys/${surveyId}/publish`} />}
          >
            Continuar
          </Button>
        </div>
      </footer>
    </div>
  );
}
