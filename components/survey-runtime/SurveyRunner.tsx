"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Heart, Menu, SkipForward, Star, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  countAnsweredMatrixRows,
  imageFrameStyle,
  matrixCellKey,
  matrixRowCount,
  type QuestionOption,
} from "@/lib/question-options";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import {
  computeProgress,
  computeQuestionProgress,
  resolveNextQuestionId,
  type AnswerValue,
  type FlowEdge,
} from "@/lib/flow-engine";
import { startResponse, submitAnswer, completeResponse } from "@/actions/responses";
import {
  BUTTON_SHAPE_CLASS,
  DESIGN_DEFAULTS,
  FONT_STACKS,
  logoPlacement,
  readableTextOn,
  runnerBackgroundColor,
  type SurveyDesign,
  type ThankYouImageMode,
} from "@/lib/survey-design";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_INSTRUCTIONS, type QuestionType } from "@/lib/question-types";
import { parseRatingConfig, type RatingShape } from "@/lib/rating-options";
import { scoreSurvey } from "@/lib/scoring";
import { TestResultsReview } from "@/components/survey-runtime/TestResultsReview";
import { SurveyFontLoader } from "@/components/surveys/SurveyFontLoader";

function RatingShapeIcon({
  shape,
  filled,
  className,
  style,
}: {
  shape: RatingShape;
  filled: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const fill = filled ? "currentColor" : "none";
  if (shape === "heart") return <Heart className={className} style={style} fill={fill} />;
  if (shape === "thumb") return <ThumbsUp className={className} style={style} fill={fill} />;
  return <Star className={className} style={style} fill={fill} />;
}

function starCountFallback(n: number): string {
  return n === 1 ? "1 estrella" : `${n} estrellas`;
}

type RuntimeQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  required: boolean;
  scoringEnabled: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
  requiredErrorMessage?: string | null;
  description?: string | null;
  randomizeOptions?: boolean;
};

function shuffleOptions(options: QuestionOption[], seed: string): QuestionOption[] {
  const specials = options.filter((o) => o.kind === "other" || o.kind === "none");
  const normals = options.filter((o) => o.kind !== "other" && o.kind !== "none");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const copy = [...normals];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const j = hash % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return [...copy, ...specials];
}

function initialAnswer(question: RuntimeQuestion | undefined): AnswerValue {
  if (question?.type === "slider") return 50;
  if (question?.type === "ranking") return question.options.map((option) => option.value);
  return "";
}

export type SurveyPreviewState = {
  currentQuestionId: string | null;
  answers: Record<string, AnswerValue>;
  draft: AnswerValue;
  started: boolean;
  finished: boolean;
};

export function SurveyRunner({
  surveyId,
  title,
  description,
  questions,
  edges,
  rootQuestionId,
  design,
  preview = false,
  previewScreen,
  questionCodes,
  previewFocusQuestionId,
  onPreviewStateChange,
}: {
  surveyId?: string;
  title: string;
  description: string | null;
  questions: RuntimeQuestion[];
  edges: FlowEdge[];
  rootQuestionId: string | null;
  design: SurveyDesign;
  /** Simulates the flow locally without touching the database — used by the
   * editor's "Vista previa" so trying it out never creates real responses. */
  preview?: boolean;
  /** Opens a specific state when the design editor previews one screen. */
  previewScreen?: "cover" | "question" | "final";
  /** Canvas / Checa display codes (e.g. "1", "2a") for the progress label. */
  questionCodes?: Record<string, string>;
  /** Canvas navigator / external jump — moves the preview to this question. */
  previewFocusQuestionId?: string | null;
  /** Checa / overview sidebar sync — only fires in preview mode. */
  onPreviewStateChange?: (state: SurveyPreviewState) => void;
}) {
  const initialFocusId =
    preview &&
    previewFocusQuestionId &&
    questions.some((question) => question.id === previewFocusQuestionId)
      ? previewFocusQuestionId
      : rootQuestionId;

  const [responseId, setResponseId] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(initialFocusId);
  const [draft, setDraft] = useState<AnswerValue>(() =>
    initialAnswer(questions.find((question) => question.id === initialFocusId)),
  );
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, AnswerValue>>({});
  const [finished, setFinished] = useState(preview && previewScreen === "final");
  const [started, setStarted] = useState(() => {
    if (preview && previewFocusQuestionId && previewFocusQuestionId === initialFocusId) {
      return true;
    }
    if (preview && previewScreen) return previewScreen !== "cover";
    return !design.welcomeEnabled;
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preview || !surveyId) return;
    startResponse(surveyId).then(setResponseId).catch(() => toast.error("La encuesta no está disponible. Recargá la página para ver su estado."));
  }, [surveyId, preview]);

  const lastFocusRequestRef = useRef<string | null>(
    preview && initialFocusId && initialFocusId === previewFocusQuestionId
      ? previewFocusQuestionId
      : null,
  );
  const answersByQuestionRef = useRef(answersByQuestion);
  answersByQuestionRef.current = answersByQuestion;

  useEffect(() => {
    if (!preview || !previewFocusQuestionId) return;
    if (previewFocusQuestionId === lastFocusRequestRef.current) return;
    if (!questions.some((question) => question.id === previewFocusQuestionId)) return;

    lastFocusRequestRef.current = previewFocusQuestionId;
    const answers = answersByQuestionRef.current;
    const existing = answers[previewFocusQuestionId];
    setStarted(true);
    setFinished(false);
    setCurrentQuestionId(previewFocusQuestionId);
    setDraft(
      existing !== undefined
        ? existing
        : initialAnswer(questions.find((question) => question.id === previewFocusQuestionId)),
    );
    setAnsweredCount(Object.keys(answers).length);
  }, [preview, previewFocusQuestionId, questions]);

  useEffect(() => {
    if (!preview || !onPreviewStateChange) return;
    onPreviewStateChange({
      currentQuestionId,
      answers: answersByQuestion,
      draft,
      started,
      finished,
    });
  }, [
    preview,
    onPreviewStateChange,
    currentQuestionId,
    answersByQuestion,
    draft,
    started,
    finished,
  ]);

  const ready = preview || responseId !== null;
  const currentQuestion = questions.find((q) => q.id === currentQuestionId) ?? null;

  // Takes the value directly (rather than reading `draft` state) so a click
  // can submit and advance in one go, without waiting on a state update.
  const submitValue = useCallback(
    async (value: AnswerValue) => {
      if (!ready || !currentQuestion) return;
      if (isEmpty(value)) {
        if (currentQuestion.required) {
          toast.error(
            currentQuestion.requiredErrorMessage?.trim() ||
              "Esta pregunta es obligatoria.",
          );
        }
        return;
      }

      setSubmitting(true);
      try {
        if (!preview) await submitAnswer(responseId!, currentQuestion.id, value);
        setAnswersByQuestion((previous) => ({ ...previous, [currentQuestion.id]: value }));
        const nextId = resolveNextQuestionId(currentQuestion.id, value, edges);
        setAnsweredCount((c) => c + 1);
        if (nextId) {
          setDraft(initialAnswer(questions.find((question) => question.id === nextId)));
          setCurrentQuestionId(nextId);
        } else {
          setDraft("");
          if (!preview) await completeResponse(responseId!);
          setFinished(true);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la respuesta");
      } finally {
        setSubmitting(false);
      }
    },
    [ready, currentQuestion, edges, preview, responseId, questions],
  );

  const handleSubmit = () => submitValue(draft);

  // Skipping an optional question records no answer at all and always follows
  // the default edge — there's no chosen option to branch on.
  const handleSkip = useCallback(async () => {
    if (!ready || !currentQuestion) return;

    setSubmitting(true);
    try {
      const nextId = resolveNextQuestionId(currentQuestion.id, undefined, edges);
      setAnsweredCount((c) => c + 1);
      if (nextId) {
        setDraft(initialAnswer(questions.find((question) => question.id === nextId)));
        setCurrentQuestionId(nextId);
      } else {
        setDraft("");
        if (!preview) await completeResponse(responseId!);
        setFinished(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo avanzar");
    } finally {
      setSubmitting(false);
    }
  }, [ready, currentQuestion, edges, preview, responseId, questions]);

  const shell = { design, title };
  const shapeClass = BUTTON_SHAPE_CLASS[design.buttonShape];
  const themeButtonStyle = {
    backgroundColor: design.themeColor,
    color: readableTextOn(design.themeColor),
  };
  const questionProgress = computeQuestionProgress(currentQuestionId, answeredCount, edges);
  const scoreTotals = scoreSurvey(questions, answersByQuestion);

  if (!rootQuestionId || questions.length === 0) {
    return (
      <CenteredCard {...shell}>
        <p className="text-muted-foreground">Esta encuesta todavía no tiene preguntas.</p>
      </CenteredCard>
    );
  }

  if (finished) {
    const showScoreReview =
      scoreTotals.hasScoring && !(preview && previewScreen === "final" && answeredCount === 0);

    if (showScoreReview) {
      return (
        <CenteredCard {...shell} wide>
          <TestResultsReview questions={questions} answers={answersByQuestion} />
        </CenteredCard>
      );
    }

    return (
      <CenteredCard
        {...shell}
        finalImage={
          design.thankYouImageUrl
            ? { url: design.thankYouImageUrl, mode: design.thankYouImageMode }
            : undefined
        }
      >
        <h2 className="text-xl font-semibold">
          {design.thankYouTitle || DESIGN_DEFAULTS.thankYouTitle}
        </h2>
        <p className="text-muted-foreground">
          {design.thankYouText || DESIGN_DEFAULTS.thankYouText}
        </p>
      </CenteredCard>
    );
  }

  // The cover: logo, title, intro line and the call to action. It renders its
  // own title, so the card header is left off.
  if (!started) {
    return (
      <CenteredCard design={design} cover>
        {design.logoUrl && (
          // A URL the survey owner pasted, so it isn't a domain next/image knows.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.logoUrl}
            alt=""
            className="mx-auto h-auto max-w-full object-contain"
            style={{ width: design.logoSize }}
          />
        )}
        <h1 className="text-center text-2xl font-semibold">{design.welcomeTitle || title}</h1>
        {design.welcomeText && (
          <p className="text-center text-muted-foreground">{design.welcomeText}</p>
        )}
        <Button
          className={cn("mt-2 w-full", shapeClass)}
          style={themeButtonStyle}
          onClick={() => setStarted(true)}
        >
          {design.welcomeButtonLabel || DESIGN_DEFAULTS.welcomeButtonLabel}
        </Button>
      </CenteredCard>
    );
  }

  if (!currentQuestion) {
    return (
      <CenteredCard {...shell}>
        <p className="text-muted-foreground">Cargando...</p>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard
      {...shell}
      headerAction={
        !currentQuestion.required ? (
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={submitting}>
            Saltear
            <SkipForward className="size-4" />
          </Button>
        ) : undefined
      }
    >
      {answeredCount === 0 && description && (
        <p className="-mt-2 text-sm text-muted-foreground">{description}</p>
      )}

      {design.showProgress && (
        <Progress
          value={computeProgress(currentQuestion.id, answeredCount, edges)}
          className="[&_[data-slot=progress-indicator]]:bg-[var(--survey-theme)]"
        >
          <ProgressLabel className="text-xs font-normal text-muted-foreground">
            Pregunta {questionCodes?.[currentQuestion.id] ?? answeredCount + 1}
          </ProgressLabel>
          {design.progressDisplay === "questions" ? (
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {questionProgress.current}/{questionProgress.total}
            </span>
          ) : (
            <ProgressValue className="text-xs" />
          )}
        </Progress>
      )}

      <h2 className="text-3xl font-bold leading-tight tracking-tight">{currentQuestion.title}</h2>

      {currentQuestion.description?.trim() ? (
        <p className="-mt-2 whitespace-pre-line text-base text-muted-foreground">
          {currentQuestion.description.trim()}
        </p>
      ) : null}

      {(() => {
        const ratingHasOther =
          currentQuestion.type === "rating" &&
          currentQuestion.options.some((option) => option.kind === "other");
        const tapEligible =
          currentQuestion.type === "single_choice" ||
          // Image questions tap-to-advance only when they ask for an exact count.
          (currentQuestion.type === "image_choice" &&
            (!imageUsesSelectionRules(currentQuestion) ||
              currentQuestion.minSelections === currentQuestion.maxSelections)) ||
          currentQuestion.type === "dropdown" ||
          (currentQuestion.type === "rating" && !ratingHasOther);
        const autoAdvances = design.advanceMode === "tap" && tapEligible;
        return (
          <>
            <QuestionInput
              question={currentQuestion}
              value={draft}
              onChange={setDraft}
              onSelect={autoAdvances ? submitValue : setDraft}
              autoAdvance={autoAdvances}
              disabled={submitting}
              themeColor={design.themeColor}
              shapeClass={shapeClass}
            />
            <p className="text-xs text-muted-foreground">
              {imageInstruction(currentQuestion) ??
                matrixRuleText(currentQuestion) ??
                QUESTION_TYPE_INSTRUCTIONS[currentQuestion.type]}
            </p>
            {autoAdvances ? null : (
              <Button
                className={cn("mt-2 w-full", shapeClass)}
                style={themeButtonStyle}
                disabled={submitting || !isAnswerComplete(currentQuestion, draft) || !ready}
                onClick={handleSubmit}
              >
                {submitting ? "Enviando..." : "Siguiente"}
              </Button>
            )}
          </>
        );
      })()}
    </CenteredCard>
  );
}

function CenteredCard({
  title,
  headerAction,
  design,
  cover = false,
  wide = false,
  finalImage,
  children,
}: {
  title?: string;
  headerAction?: React.ReactNode;
  design: SurveyDesign;
  /** The cover renders its own logo, so the small one is left out. */
  cover?: boolean;
  /** Slightly wider card for the test-results review. */
  wide?: boolean;
  /** Final-screen image: a card header or the full-screen background. */
  finalImage?: { url: string; mode: ThankYouImageMode };
  children: React.ReactNode;
}) {
  const { atTop, alignClass } = logoPlacement(design.logoPosition);
  const pageBackground = runnerBackgroundColor(design);
  const isDarkLayout = design.colorMode === "dark";
  const glassUsesDarkMaterial = readableTextOn(pageBackground) === "#ffffff";

  // Logo lives inside the card frame (same recuadro as questions / thank-you /
  // score review). The cover screen still paints its own larger logo in children.
  const smallLogo = !cover && design.logoUrl && (
    <div className={cn("flex w-full px-6", atTop ? "pt-6" : "pb-6", alignClass)}>
      {/* A URL the survey owner pasted, so it isn't a domain next/image knows. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={design.logoUrl}
        alt=""
        className="h-auto max-w-full object-contain"
        style={{ width: design.logoSize }}
      />
    </div>
  );

  const backgroundUrl =
    finalImage?.mode === "background"
      ? finalImage.url
      : design.backgroundImageUrl &&
          (design.backgroundImageScope === "all" || cover)
        ? design.backgroundImageUrl
        : null;

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-4 p-6",
        isDarkLayout ? "dark" : "survey-force-light",
      )}
      style={
        {
          backgroundColor: pageBackground,
          colorScheme: isDarkLayout ? "dark" : "light",
          fontFamily: FONT_STACKS[design.fontFamily],
          "--survey-theme": design.themeColor,
          "--survey-glass-fill": glassUsesDarkMaterial
            ? "rgb(0 0 0 / 42%)"
            : "rgb(255 255 255 / 56%)",
          "--survey-glass-control": glassUsesDarkMaterial
            ? "rgb(0 0 0 / 30%)"
            : "rgb(255 255 255 / 42%)",
          "--survey-glass-text": glassUsesDarkMaterial ? "#ffffff" : "#18181b",
        } as React.CSSProperties
      }
    >
      <SurveyFontLoader fontFamily={design.fontFamily} />
      {/* Background image stays put while the questions change. */}
      {backgroundUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${backgroundUrl}")` }}
        />
      )}

      <div className="relative flex w-full flex-col items-center gap-4">
        <Card
          className={cn(
            "survey-response-card w-full",
            wide ? "max-w-lg" : "max-w-md",
            design.surfaceStyle === "transparent" && "survey-response-card--transparent",
            design.surfaceStyle === "blur" && "survey-response-card--blur",
            design.surfaceStyle === "glass" && "survey-response-card--glass",
          )}
        >
          {finalImage?.mode === "header" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={finalImage.url} alt="" className="h-40 w-full object-cover" />
          )}
          {atTop && smallLogo}
          {(title || headerAction) && (
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              {title ? <CardTitle>{title}</CardTitle> : <span />}
              {headerAction}
            </CardHeader>
          )}
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
          {!atTop && smallLogo}
        </Card>
      </div>
    </div>
  );
}

function isEmpty(value: AnswerValue): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object" && value !== null) {
    return Object.values(value).every((item) => String(item).trim() === "");
  }
  return value === "" || value === undefined || value === null;
}

function asRecord(value: AnswerValue): Record<string, string | number> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

/**
 * Image questions follow the checkbox rules once they carry selection limits
 * (exactly / at least / at most). Older ones without limits stay single-pick.
 */
function imageUsesSelectionRules(question: RuntimeQuestion): boolean {
  return (
    question.type === "image_choice" &&
    (question.minSelections != null || question.maxSelections != null)
  );
}

function imageInstruction(question: RuntimeQuestion): string | null {
  if (!imageUsesSelectionRules(question)) return null;
  const { minSelections: min, maxSelections: max } = question;
  const images = (n: number) => (n === 1 ? "una imagen" : `${n} imágenes`);
  if (min != null && min === max) return `Selecciona ${images(min)}`;
  if (min != null) return `Selecciona al menos ${images(min)}`;
  return `Selecciona como máximo ${images(max ?? 1)}`;
}

/** Plain-language row-count rule of a dropdown matrix, or null when every row is required. */
function matrixRuleText(question: RuntimeQuestion): string | null {
  if (question.type !== "dropdown_matrix") return null;
  const { minSelections: min, maxSelections: max } = question;
  const rows = (n: number) => (n === 1 ? "1 fila" : `${n} filas`);
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    return min === max ? `Respondé ${rows(min)}` : `Respondé entre ${min} y ${rows(max)}`;
  }
  if (min != null) return `Respondé al menos ${rows(min)}`;
  return `Respondé como máximo ${rows(max ?? 1)}`;
}

function isAnswerComplete(question: RuntimeQuestion, value: AnswerValue): boolean {
  if (isEmpty(value)) return false;
  if (question.type === "rating") {
    if (value === "na") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return typeof value.rating === "number" && Number.isFinite(value.rating) && value.rating !== 0;
    }
    return false;
  }
  if (question.type === "multi_choice" || (question.type === "image_choice" && Array.isArray(value))) {
    const count = Array.isArray(value) ? value.length : 0;
    if (question.minSelections != null && count < question.minSelections) return false;
    if (question.maxSelections != null && count > question.maxSelections) return false;
  }
  const record = asRecord(value);
  if (question.type === "dropdown_matrix") {
    const answered = countAnsweredMatrixRows(question.options, record);
    const { minSelections: min, maxSelections: max } = question;
    // No rule = every row must be answered ("todas").
    if (min == null && max == null) return answered === matrixRowCount(question.options);
    return (min == null || answered >= min) && (max == null || answered <= max);
  }
  if (question.type === "rating_matrix" || question.type === "multiple_text") {
    return question.options.every((option) => String(record[option.value] ?? "").trim());
  }
  if (question.type === "address") {
    return ["calle", "ciudad", "provincia", "codigo_postal", "pais"].every((key) => String(record[key] ?? "").trim());
  }
  if (question.type === "best_worst") {
    return Boolean(record.best && record.worst && record.best !== record.worst);
  }
  return true;
}

function RatingInput({
  question,
  value,
  onChange,
  onSelect,
  autoAdvance,
  disabled,
  themeColor,
  shapeClass,
}: {
  question: RuntimeQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onSelect: (value: AnswerValue) => void;
  autoAdvance: boolean;
  disabled: boolean;
  themeColor: string;
  shapeClass: string;
}) {
  const config = parseRatingConfig(question.options);
  const ratingValue =
    typeof value === "number"
      ? value
      : typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          typeof value.rating === "number"
        ? value.rating
        : null;
  const selectedNa = value === "na";
  const selectedIndex =
    ratingValue === null
      ? -1
      : config.levels.findIndex(
          (level) => Number(level.value) === ratingValue || level.value === String(ratingValue),
        );
  const [comment, setComment] = useState(() =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? String(value.other ?? "")
      : "",
  );

  const applyRating = (next: number | "na") => {
    if (next === "na") {
      if (autoAdvance && !config.hasOther) onSelect("na");
      else onChange("na");
      return;
    }
    const payload: AnswerValue =
      config.hasOther && comment.trim() ? { rating: next, other: comment.trim() } : next;
    if (autoAdvance && !config.hasOther) onSelect(payload);
    else onChange(payload);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {config.levels.map((level, index) => {
          const numeric = Number(level.value);
          const answerValue = Number.isFinite(numeric) ? numeric : index + 1;
          const filled = selectedIndex >= 0 && index <= selectedIndex;
          const active = selectedIndex === index;
          const labelText = level.label?.trim() || starCountFallback(index + 1);
          return (
            <button
              key={`${level.value}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => applyRating(answerValue)}
              style={
                active
                  ? {
                      backgroundColor: config.color,
                      borderColor: config.color,
                      color: readableTextOn(config.color),
                    }
                  : { color: config.color }
              }
              className={cn(
                "survey-option-surface flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 border px-1.5 py-2 hover:bg-muted",
                shapeClass,
              )}
              aria-label={labelText}
              title={labelText}
            >
              <RatingShapeIcon shape={config.shape} filled={filled} className="size-5 shrink-0" />
              {config.labelsEnabled ? (
                <span
                  className={cn(
                    "max-w-24 text-center text-[11px] leading-tight font-medium wrap-break-word",
                    active ? "opacity-95" : "text-foreground",
                  )}
                >
                  {labelText}
                </span>
              ) : null}
            </button>
          );
        })}
        {config.hasNa ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyRating("na")}
            style={
              selectedNa
                ? {
                    backgroundColor: themeColor,
                    borderColor: themeColor,
                    color: readableTextOn(themeColor),
                  }
                : undefined
            }
            className={cn(
              "survey-option-surface flex min-h-11 min-w-14 flex-col items-center justify-center border px-3 py-2 text-sm font-medium hover:bg-muted",
              shapeClass,
            )}
          >
            N/A
          </button>
        ) : null}
      </div>
      {config.hasOther ? (
        <Input
          value={comment}
          disabled={disabled}
          placeholder="Comentario (opcional)"
          onChange={(event) => {
            const text = event.target.value;
            setComment(text);
            if (ratingValue === null) return;
            onChange(text.trim() ? { rating: ratingValue, other: text } : ratingValue);
          }}
        />
      ) : null}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
  onSelect,
  autoAdvance,
  disabled,
  themeColor,
  shapeClass,
}: {
  question: RuntimeQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  onSelect: (value: AnswerValue) => void;
  autoAdvance: boolean;
  disabled: boolean;
  themeColor: string;
  shapeClass: string;
}) {
  const pick = autoAdvance ? onSelect : onChange;
  const selectedStyle = { borderColor: themeColor };
  const displayOptions = useMemo(
    () =>
      question.randomizeOptions
        ? shuffleOptions(question.options, question.id)
        : question.options,
    [question.id, question.options, question.randomizeOptions],
  );

  if (question.type === "text") {
    return (
      <Textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tu respuesta"
        className={shapeClass}
        disabled={disabled}
        autoFocus
      />
    );
  }

  if (["short_text", "name", "email", "phone", "datetime"].includes(question.type)) {
    const inputType = question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "datetime" ? "datetime-local" : "text";
    const placeholder = question.type === "name" ? "Nombre y apellido" : question.type === "email" ? "nombre@ejemplo.com" : question.type === "phone" ? "+54 11 1234 5678" : "Tu respuesta";
    return (
      <Input
        type={inputType}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={shapeClass}
        disabled={disabled}
        autoFocus
      />
    );
  }

  if (question.type === "address") {
    const record = asRecord(value);
    const fields = [
      ["calle", "Calle y número"],
      ["ciudad", "Ciudad"],
      ["provincia", "Provincia/Estado"],
      ["codigo_postal", "Código postal"],
      ["pais", "País"],
    ] as const;
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(([key, label], index) => (
          <Input
            key={key}
            value={String(record[key] ?? "")}
            onChange={(event) => onChange({ ...record, [key]: event.target.value })}
            placeholder={label}
            className={cn(shapeClass, index === 0 && "sm:col-span-2")}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  if (question.type === "multiple_text") {
    const record = asRecord(value);
    return (
      <div className="flex flex-col gap-3">
        {question.options.map((option) => (
          <label key={option.value} className="flex flex-col gap-1.5 text-sm">
            <span>{option.label}</span>
            <Input value={String(record[option.value] ?? "")} onChange={(event) => onChange({ ...record, [option.value]: event.target.value })} className={shapeClass} disabled={disabled} />
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "rating") {
    return (
      <RatingInput
        question={question}
        value={value}
        onChange={onChange}
        onSelect={onSelect}
        autoAdvance={autoAdvance}
        disabled={disabled}
        themeColor={themeColor}
        shapeClass={shapeClass}
      />
    );
  }

  if (question.type === "slider") {
    const number = typeof value === "number" ? value : 50;
    const leftLabel = question.options.find((option) => option.kind === "scale_left")?.label || "0";
    const centerLabel = question.options.find((option) => option.kind === "scale_center")?.label;
    const rightLabel = question.options.find((option) => option.kind === "scale_right")?.label || "100";
    return (
      <div className="flex flex-col gap-3">
        <output className="text-center text-2xl font-semibold">{number}</output>
        <input type="range" min={0} max={100} step={1} value={number} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} className="w-full accent-[var(--survey-theme)]" />
        <div className="grid grid-cols-3 text-xs text-muted-foreground">
          <span className="text-left">{leftLabel}</span>
          <span className="text-center">{centerLabel}</span>
          <span className="text-right">{rightLabel}</span>
        </div>
      </div>
    );
  }

  if (question.type === "ranking") {
    return (
      <RankingInput
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
        shapeClass={shapeClass}
      />
    );
  }

  if (question.type === "dropdown") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(event) => pick(event.target.value)}
        disabled={disabled}
        className={cn("h-10 w-full border bg-background px-3 text-sm", shapeClass)}
      >
        <option value="">Seleccioná una opción</option>
        {displayOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (question.type === "dropdown_matrix") {
    const record = asRecord(value);
    const allRows = question.options.filter((option) => option.kind === "row");
    const rows = question.randomizeOptions ? shuffleOptions(allRows, question.id) : allRows;
    const columns = question.options.filter((option) => option.kind === "column");
    const choices = question.options.filter((option) => option.kind === "choice");
    const otherOption = question.options.find((option) => option.kind === "other");
    const choicesOf = (columnValue?: string) =>
      choices.filter((choice) => !choice.columnValue || choice.columnValue === columnValue);
    const selectClass = cn("h-10 w-full min-w-32 border bg-background px-3", shapeClass);
    const ruleText = matrixRuleText(question);
    const answeredRows = countAnsweredMatrixRows(question.options, record);
    const ruleBroken =
      ruleText !== null &&
      !isEmpty(value) &&
      ((question.minSelections != null && answeredRows < question.minSelections) ||
        (question.maxSelections != null && answeredRows > question.maxSelections));
    const ruleHint = ruleBroken ? (
      <p className="text-sm text-destructive">{question.selectionErrorMessage || `${ruleText}.`}</p>
    ) : null;
    const otherField = otherOption ? (
      <label className="mt-1 flex flex-col gap-1.5 text-sm">
        <span>{otherOption.label}</span>
        <Input
          value={String(record[otherOption.value] ?? "")}
          onChange={(event) => onChange({ ...record, [otherOption.value]: event.target.value })}
          disabled={disabled}
          className={shapeClass}
        />
      </label>
    ) : null;

    if (columns.length >= 2) {
      return (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr>
                  <th />
                  {columns.map((column) => (
                    <th key={column.value} className="px-1 text-left font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.value}>
                    <td className="pr-3 align-middle">{row.label}</td>
                    {columns.map((column) => {
                      const key = matrixCellKey(row.value, column.value);
                      return (
                        <td key={column.value} className="px-1">
                          <select
                            value={String(record[key] ?? "")}
                            onChange={(event) => onChange({ ...record, [key]: event.target.value })}
                            disabled={disabled}
                            className={selectClass}
                            aria-label={`${row.label} – ${column.label}`}
                          >
                            <option value="">Seleccioná</option>
                            {choicesOf(column.value).map((choice) => (
                              <option key={choice.value} value={choice.value}>
                                {choice.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ruleHint}
          {otherField}
        </div>
      );
    }

    const menuChoices = choicesOf(columns[0]?.value);
    return (
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <label key={row.value} className="flex flex-col gap-1.5 text-sm">
            <span>{row.label}</span>
            <select value={String(record[row.value] ?? "")} onChange={(event) => onChange({ ...record, [row.value]: event.target.value })} disabled={disabled} className={cn("h-10 border bg-background px-3", shapeClass)}>
              <option value="">Seleccioná</option>
              {menuChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            </select>
          </label>
        ))}
        {ruleHint}
        {otherField}
      </div>
    );
  }

  if (question.type === "rating_matrix") {
    const record = asRecord(value);
    return (
      <div className="flex flex-col gap-3">
        {question.options.map((row) => (
          <div key={row.value} className="flex items-center gap-3">
            <span className="flex-1 text-sm">{row.label}</span>
            <select value={String(record[row.value] ?? "")} onChange={(event) => onChange({ ...record, [row.value]: Number(event.target.value) })} disabled={disabled} className={cn("h-9 border bg-background px-2 text-sm", shapeClass)} aria-label={`Valorar ${row.label}`}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((number) => <option key={number} value={number}>{number}</option>)}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "best_worst") {
    const record = asRecord(value);
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {(["best", "worst"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm">
            <span>{key === "best" ? "Mejor" : "Peor"}</span>
            <select value={String(record[key] ?? "")} onChange={(event) => onChange({ ...record, [key]: event.target.value })} disabled={disabled} className={cn("h-10 border bg-background px-3", shapeClass)}>
              <option value="">Seleccioná</option>
              {question.options.map((option) => <option key={option.value} value={option.value} disabled={record[key === "best" ? "worst" : "best"] === option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "multi_choice") {
    const selected = Array.isArray(value) ? value : [];
    const noneOption = displayOptions.find((option) => option.kind === "none");
    const reachedMaximum =
      question.maxSelections != null && selected.length >= question.maxSelections;
    const meetsMinimum =
      question.minSelections == null || selected.length >= question.minSelections;
    const validationMessage = question.selectionErrorMessage || (
      question.minSelections != null && question.minSelections === question.maxSelections
        ? `Seleccioná exactamente ${question.minSelections} opciones.`
        : question.minSelections != null
          ? `Seleccioná al menos ${question.minSelections} opciones.`
          : question.maxSelections != null
            ? `Seleccioná como máximo ${question.maxSelections} opciones.`
            : ""
    );
    return (
      <div className="flex flex-col gap-2">
        {displayOptions.map((option) => {
          const checked = selected.includes(option.value);
          const optionDisabled = disabled || (!checked && reachedMaximum && option.kind !== "none");
          return (
            <button
              key={option.value}
              type="button"
              disabled={optionDisabled}
              onClick={() => {
                if (option.kind === "none") {
                  onChange(checked ? [] : [option.value]);
                  return;
                }
                const withoutNone = noneOption
                  ? selected.filter((v) => v !== noneOption.value)
                  : selected;
                onChange(
                  checked
                    ? withoutNone.filter((v) => v !== option.value)
                    : [...withoutNone, option.value],
                );
              }}
              style={checked ? selectedStyle : undefined}
              className={cn(
                "survey-option-surface border px-3 py-2 text-left text-sm hover:bg-muted",
                shapeClass,
                checked && "bg-muted",
                optionDisabled && !checked && "cursor-not-allowed opacity-45",
              )}
            >
              {option.label}
            </button>
          );
        })}
        {reachedMaximum && (
          <p className="text-xs font-medium text-muted-foreground" role="status">
            Alcanzaste el máximo de {question.maxSelections} opciones.
          </p>
        )}
        {!meetsMinimum && selected.length > 0 && validationMessage && (
          <p className="text-xs text-destructive" role="alert">{validationMessage}</p>
        )}
      </div>
    );
  }

  if (question.type === "image_choice") {
    const multi = imageUsesSelectionRules(question);
    const selectedMany = Array.isArray(value) ? value : [];
    const selected = typeof value === "string" ? value : null;
    const reachedMaximum = multi && question.maxSelections != null && selectedMany.length >= question.maxSelections;
    const meetsMinimum =
      !multi || question.minSelections == null || selectedMany.length >= question.minSelections;
    const validationMessage =
      question.selectionErrorMessage ||
      (question.minSelections != null && question.minSelections === question.maxSelections
        ? `Seleccioná exactamente ${question.minSelections} ${question.minSelections === 1 ? "imagen" : "imágenes"}.`
        : question.minSelections != null
          ? `Seleccioná al menos ${question.minSelections} ${question.minSelections === 1 ? "imagen" : "imágenes"}.`
          : question.maxSelections != null
            ? `Seleccioná como máximo ${question.maxSelections} ${question.maxSelections === 1 ? "imagen" : "imágenes"}.`
            : "");
    const isChecked = (optionValue: string) =>
      multi ? selectedMany.includes(optionValue) : selected === optionValue;
    const handlePick = (optionValue: string) => {
      if (!multi) {
        pick(optionValue);
        return;
      }
      let next: string[];
      if (selectedMany.includes(optionValue)) {
        next = selectedMany.filter((item) => item !== optionValue);
      } else if (question.maxSelections === 1) {
        // Pick-one rule: tapping another image swaps the selection.
        next = [optionValue];
      } else {
        next = [...selectedMany, optionValue];
      }
      // Tap mode sends as soon as an exact count is met.
      if (autoAdvance && next.length === question.minSelections) onSelect(next);
      else onChange(next);
    };
    return (
      <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        {displayOptions.map((option) => {
          const checked = isChecked(option.value);
          const blocked = reachedMaximum && !checked && question.maxSelections !== 1;
          return (
          <button
            key={option.value}
            type="button"
            disabled={disabled || blocked}
            onClick={() => handlePick(option.value)}
            style={checked ? selectedStyle : undefined}
            className={cn(
              "survey-option-surface overflow-hidden border text-left hover:bg-muted",
              shapeClass,
              checked && "bg-muted",
              blocked && "cursor-not-allowed opacity-45",
            )}
          >
            {option.imageUrl ? (
              <div className="aspect-video w-full overflow-hidden">
                {/* The survey creator controls these external image URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={option.imageUrl}
                  alt=""
                  className="size-full object-cover"
                  style={imageFrameStyle(option)}
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground">
                Sin imagen
              </div>
            )}
            <span className="block px-3 py-2 text-sm">{option.label}</span>
          </button>
          );
        })}
      </div>
      {reachedMaximum && question.maxSelections !== 1 && (
        <p className="text-xs font-medium text-muted-foreground" role="status">
          Alcanzaste el máximo de {question.maxSelections} imágenes.
        </p>
      )}
      {multi && !meetsMinimum && selectedMany.length > 0 && validationMessage && (
        <p className="text-xs text-destructive" role="alert">{validationMessage}</p>
      )}
      </div>
    );
  }

  // single_choice (dropdown handled above)
  const selected = typeof value === "string" ? value : null;
  const otherOption = displayOptions.find((option) => option.kind === "other");
  const otherSelected = Boolean(otherOption && selected === otherOption.value);
  return (
    <div className="flex flex-col gap-2">
      {displayOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => pick(option.value)}
          style={selected === option.value ? selectedStyle : undefined}
          className={cn(
            "survey-option-surface border px-3 py-2 text-left text-sm hover:bg-muted",
            shapeClass,
            selected === option.value && "bg-muted",
          )}
        >
          {option.label}
        </button>
      ))}
      {otherSelected ? (
        <Input
          autoFocus
          placeholder="Especificá tu respuesta"
          disabled={disabled}
          className="mt-1"
          onChange={() => {
            /* free-text companion is display-only until we persist other text; selection still counts */
          }}
        />
      ) : null}
    </div>
  );
}

function RankingInput({
  question,
  value,
  onChange,
  disabled,
  shapeClass,
}: {
  question: RuntimeQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  disabled: boolean;
  shapeClass: string;
}) {
  const [draggedValue, setDraggedValue] = useState<string | null>(null);
  const order = Array.isArray(value) && value.length
    ? value.map(String)
    : question.options.map((option) => option.value);

  const moveTo = (optionValue: string, targetIndex: number) => {
    const sourceIndex = order.indexOf(optionValue);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;

    const next = [...order];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {order.map((optionValue, index) => {
        const option = question.options.find((item) => item.value === optionValue);
        const isDragging = draggedValue === optionValue;

        return (
          <div
            key={optionValue}
            data-ranking-value={optionValue}
            draggable={!disabled}
            className={cn(
              "survey-option-surface flex cursor-grab items-center gap-3 border p-2 transition-opacity active:cursor-grabbing",
              shapeClass,
              isDragging && "opacity-60",
              disabled && "cursor-not-allowed",
            )}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", optionValue);
              setDraggedValue(optionValue);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => {
              if (draggedValue) moveTo(draggedValue, index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDraggedValue(null);
            }}
            onDragEnd={() => setDraggedValue(null)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {index + 1}
            </span>
            <span className="flex-1 text-sm">{option?.label ?? optionValue}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Reordenar ${option?.label ?? optionValue}. Posición ${index + 1} de ${order.length}`}
              className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" && index > 0) {
                  event.preventDefault();
                  moveTo(optionValue, index - 1);
                }
                if (event.key === "ArrowDown" && index < order.length - 1) {
                  event.preventDefault();
                  moveTo(optionValue, index + 1);
                }
              }}
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
