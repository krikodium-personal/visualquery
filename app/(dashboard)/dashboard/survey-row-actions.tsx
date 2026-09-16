"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteSurvey, togglePublish } from "@/actions/surveys";
import { Button } from "@/components/ui/button";

export function SurveyRowActions({
  surveyId,
  status,
  slug,
}: {
  surveyId: string;
  status: string;
  slug: string;
}) {
  const [isPending, startTransition] = useTransition();

  const copyLink = () => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="flex gap-2 text-sm">
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() => startTransition(() => togglePublish(surveyId))}
      >
        {status === "published" ? "Cerrar" : "Abrir"}
      </Button>
      {status === "published" && (
        <Button size="sm" variant="ghost" onClick={copyLink}>
          Copiar link
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={isPending}
        onClick={() => {
          if (confirm("¿Eliminar esta encuesta? No se puede deshacer.")) {
            startTransition(() => deleteSurvey(surveyId));
          }
        }}
      >
        Eliminar
      </Button>
    </div>
  );
}
