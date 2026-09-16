"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { togglePublish } from "@/actions/surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PublishPanel({
  surveyId,
  slug,
  status,
  questionCount,
  publicUrl,
}: {
  surveyId: string;
  slug: string;
  status: "draft" | "published" | "closed";
  questionCount: number;
  publicUrl: string;
}) {
  const [isPending, startTransition] = useTransition();

  const published = status === "published";
  const noQuestions = questionCount === 0;

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado");
  };

  const handleToggle = () =>
    startTransition(async () => {
      try {
        await togglePublish(surveyId);
        toast.success(published ? "Encuesta cerrada" : "Encuesta abierta");
      } catch {
        toast.error("No se pudo cambiar el estado");
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {published ? "La encuesta está abierta" : status === "closed" ? "La encuesta está cerrada" : "La encuesta está en borrador"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {published
              ? "Cualquiera con el link puede responderla. Si la cerrás, deja de aceptar respuestas."
              : noQuestions
                ? "Agregá al menos una pregunta antes de publicarla."
                : "No está aceptando respuestas. Abrila para compartir el link público."}
          </p>
          <div>
            <Button onClick={handleToggle} disabled={isPending || (!published && noQuestions)}>
              {isPending ? "Guardando..." : published ? "Cerrar" : "Abrir"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {published && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Link para compartir</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copiar link">
                <Copy className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                nativeButton={false}
                aria-label="Abrir encuesta"
                render={<a href={`/s/${slug}`} target="_blank" rel="noreferrer" />}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
