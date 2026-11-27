"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { togglePublish, updateCustomVariables } from "@/actions/surveys";
import { CollectorList, type CollectorRow } from "@/components/surveys/CollectorList";
import { SharingSettings, type SharingValues } from "@/components/surveys/SharingSettings";
import type { CustomVariable } from "@/lib/custom-variables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Publicación: survey on/off, its collectors (links) and the settings they all share. */
export function PublishPanel({
  surveyId,
  status,
  questionCount,
  origin,
  collectors,
  customVariables,
  surveyTitle,
  sharing,
}: {
  surveyId: string;
  status: "draft" | "published" | "closed";
  questionCount: number;
  origin: string;
  collectors: CollectorRow[];
  customVariables: CustomVariable[];
  surveyTitle: string;
  sharing: SharingValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [variables, setVariables] = useState<{ name: string; label: string }[]>(
    customVariables.map((variable) => ({ name: variable.name, label: variable.label ?? "" })),
  );

  const published = status === "published";
  const noQuestions = questionCount === 0;
  const exampleUrl = `${origin}/s/${collectors[0]?.slug ?? "tu-encuesta"}`;

  const handleToggle = () =>
    startTransition(async () => {
      try {
        await togglePublish(surveyId);
        toast.success(published ? "Encuesta cerrada" : "Encuesta abierta");
      } catch {
        toast.error("No se pudo cambiar el estado");
      }
    });

  const saveVariables = () =>
    startTransition(async () => {
      try {
        const result = await updateCustomVariables(
          surveyId,
          variables
            .filter((variable) => variable.name.trim() !== "")
            .map((variable) => ({ name: variable.name.trim(), label: variable.label.trim() })),
        );
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Variables guardadas");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron guardar las variables");
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {published
              ? "La encuesta está abierta"
              : status === "closed"
                ? "La encuesta está cerrada"
                : "La encuesta está en borrador"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {published
              ? "Cualquiera con el link de un recopilador abierto puede responderla. Si la cerrás, deja de aceptar respuestas en todos."
              : noQuestions
                ? "Agregá al menos una pregunta antes de publicarla."
                : "No está aceptando respuestas. Abrila para compartir los links."}
          </p>
          <div>
            <Button onClick={handleToggle} disabled={isPending || (!published && noQuestions)}>
              {isPending ? "Guardando..." : published ? "Cerrar" : "Abrir"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CollectorList
        surveyId={surveyId}
        origin={origin}
        collectors={collectors}
        surveyOpen={published}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variables personalizadas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Datos que viajan en el link y se guardan con cada respuesta, por ejemplo{" "}
            <code className="rounded bg-muted px-1">{exampleUrl}?campania=mail1</code>. Aparecen
            en el análisis y en el CSV.
          </p>
          {variables.map((variable, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`var-name-${index}`}>Nombre</Label>
                <Input
                  id={`var-name-${index}`}
                  value={variable.name}
                  maxLength={50}
                  placeholder="campania"
                  autoComplete="off"
                  onChange={(event) =>
                    setVariables((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, name: event.target.value.replace(/\s/g, "") } : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`var-label-${index}`}>Etiqueta (opcional)</Label>
                <Input
                  id={`var-label-${index}`}
                  value={variable.label}
                  maxLength={250}
                  placeholder="Campaña"
                  autoComplete="off"
                  onChange={(event) =>
                    setVariables((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Quitar variable"
                onClick={() => setVariables((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVariables((current) => [...current, { name: "", label: "" }])}
            >
              <Plus className="size-4" /> Agregar variable
            </Button>
            <Button onClick={saveVariables} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar variables"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SharingSettings surveyId={surveyId} surveyTitle={surveyTitle} initial={sharing} />
    </div>
  );
}
