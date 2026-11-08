"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurveyRunner } from "@/components/survey-runtime/SurveyRunner";
import type { QuestionOption } from "@/lib/question-options";
import type { FlowEdge } from "@/lib/flow-engine";
import type { SurveyDesign } from "@/lib/survey-design";
import type { QuestionType } from "@/lib/question-types";
import { cn } from "@/lib/utils";

type PreviewQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  required: boolean;
  scoringEnabled: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
  requiredErrorMessage: string | null;
  randomizeOptions: boolean;
};

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
  const [runKey, setRunKey] = useState(0);

  const frameMaxWidth = useMemo(
    () => DEVICE_OPTIONS.find((option) => option.id === device)?.maxWidth ?? null,
    [device],
  );

  return (
    <div className="fixed inset-0 z-50 flex min-h-0 flex-col bg-muted/30">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-3 py-2.5 sm:gap-3 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/surveys/${surveyId}/questions`} />}
        >
          <ArrowLeft className="size-4" />
          Editar
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Vista previa</p>
          <p className="truncate text-xs text-muted-foreground">{title}</p>
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
              aria-label={label}
              aria-pressed={device === id}
              title={label}
              onClick={() => setDevice(id)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRunKey((key) => key + 1)}
        >
          <RotateCcw className="size-3.5" />
          Reiniciar
        </Button>
      </header>

      <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        Estás en vista previa — las respuestas no se guardan.
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        <div
          className={cn(
            "mx-auto flex min-h-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm transition-[max-width] duration-200",
            frameMaxWidth ? "w-full" : "w-full max-w-3xl",
          )}
          style={frameMaxWidth ? { maxWidth: frameMaxWidth } : undefined}
        >
          <div key={runKey} className="flex min-h-[70vh] flex-1 flex-col">
            <SurveyRunner
              preview
              title={title}
              description={description}
              questions={questions}
              edges={edges}
              rootQuestionId={rootQuestionId}
              design={design}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
