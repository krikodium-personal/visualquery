"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurveyStatusPill } from "@/components/surveys/SurveyStatusPill";
import { SurveyRowActions } from "./survey-row-actions";

type SurveyCardProps = {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  slug: string;
  questionCount: number;
  responseCount: number;
};

export function SurveyCard({
  id,
  title,
  status,
  slug,
  questionCount,
  responseCount,
}: SurveyCardProps) {
  const router = useRouter();
  const href = `/surveys/${id}/questions`;

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Abrir ${title}`}
      className="cursor-pointer border-[#EDE9DE] shadow-[0_0_20px_0_rgb(78_67_37_/_12%)] transition-shadow hover:shadow-[0_0_24px_0_rgb(78_67_37_/_18%)] focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle className="min-w-0 flex-1 line-clamp-1 font-bold">{title}</CardTitle>
        <div
          className="flex shrink-0 items-center gap-1.5"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <SurveyStatusPill surveyId={id} status={status} />
          {status === "published" ? (
            <Button
              size="icon-sm"
              variant="ghost"
              className="shrink-0"
              nativeButton={false}
              aria-label="Ver encuesta"
              title="Ver encuesta"
              render={<a href={`/s/${slug}`} target="_blank" rel="noreferrer" />}
            >
              <Eye className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {questionCount} preguntas · {responseCount} respuestas
        </p>
        <div
          className="flex gap-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            size="sm"
            className="flex-1"
            nativeButton={false}
            render={<Link href={`/surveys/${id}/questions`}>Editar</Link>}
          />
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            nativeButton={false}
            render={<Link href={`/surveys/${id}/results`}>Resultados</Link>}
          />
        </div>
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <SurveyRowActions status={status} slug={slug} />
        </div>
      </CardContent>
    </Card>
  );
}
