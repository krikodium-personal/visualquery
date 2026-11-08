"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurveyStatusPill } from "@/components/surveys/SurveyStatusPill";
import { SurveyRowActions } from "./survey-row-actions";

type SurveyCardProps = {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  slug: string;
  responseCount: number;
  updatedAt: string;
};

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function SurveyCard({
  id,
  title,
  status,
  slug,
  responseCount,
  updatedAt,
}: SurveyCardProps) {
  const [selected, setSelected] = useState(false);
  const updatedLabel = formatUpdatedAt(updatedAt);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border/80 px-1 py-3 sm:flex-nowrap sm:gap-4">
      <label className="flex shrink-0 items-center self-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => setSelected(event.target.checked)}
          className="size-4 accent-emerald-700"
          aria-label={`Seleccionar ${title}`}
        />
      </label>

      <div className="shrink-0 self-center" onClick={(event) => event.stopPropagation()}>
        <SurveyStatusPill surveyId={id} status={status} />
      </div>

      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <Link
          href={`/surveys/${id}/questions`}
          className="block truncate text-base font-semibold text-foreground hover:underline"
        >
          {title}
        </Link>
        {updatedLabel ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5 shrink-0 opacity-70" aria-hidden />
            Se actualizó el {updatedLabel}
          </p>
        ) : null}
      </div>

      <p className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
        <BarChart3 className="size-3.5 opacity-70" aria-hidden />
        {responseCount.toLocaleString("es-AR")} respuestas
      </p>

      <Button
        variant="outline"
        size="icon-sm"
        className="shrink-0"
        nativeButton={false}
        aria-label="Analiza los resultados"
        title="Analiza los resultados"
        render={<Link href={`/surveys/${id}/results`} />}
      >
        <BarChart3 className="size-4" />
      </Button>

      <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
        <SurveyRowActions surveyId={id} title={title} status={status} slug={slug} />
      </div>
    </div>
  );
}
