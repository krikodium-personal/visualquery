"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSharingOptions } from "@/actions/surveys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageSourceField } from "@/components/ui/image-source-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SharingValues = {
  shareTitle: string | null;
  shareDescription: string | null;
  shareImageUrl: string | null;
  endRedirectUrl: string | null;
  disqualifyMessage: string | null;
  disqualifyRedirectUrl: string | null;
};

/** Link preview, redirect after answering and disqualification screen. */
export function SharingSettings({
  surveyId,
  surveyTitle,
  initial,
}: {
  surveyId: string;
  surveyTitle: string;
  initial: SharingValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [shareTitle, setShareTitle] = useState(initial.shareTitle ?? "");
  const [shareDescription, setShareDescription] = useState(initial.shareDescription ?? "");
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(initial.shareImageUrl);
  const [endRedirectUrl, setEndRedirectUrl] = useState(initial.endRedirectUrl ?? "");
  const [disqualifyMessage, setDisqualifyMessage] = useState(initial.disqualifyMessage ?? "");
  const [disqualifyRedirectUrl, setDisqualifyRedirectUrl] = useState(
    initial.disqualifyRedirectUrl ?? "",
  );

  const save = () =>
    startTransition(async () => {
      try {
        const result = await updateSharingOptions(surveyId, {
          shareTitle,
          shareDescription,
          shareImageUrl: shareImageUrl ?? "",
          endRedirectUrl,
          disqualifyMessage,
          disqualifyRedirectUrl,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Opciones guardadas");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron guardar las opciones");
      }
    });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vista previa del link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Cómo se ve el link al compartirlo en WhatsApp, redes o correo. Si lo dejás vacío se usa
            el título de la encuesta.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shareTitle">Título</Label>
            <Input
              id="shareTitle"
              value={shareTitle}
              maxLength={120}
              placeholder={surveyTitle}
              onChange={(event) => setShareTitle(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shareDescription">Descripción</Label>
            <Textarea
              id="shareDescription"
              value={shareDescription}
              maxLength={300}
              rows={2}
              onChange={(event) => setShareDescription(event.target.value)}
            />
          </div>
          <ImageSourceField
            id="shareImageUrl"
            label="Imagen (recomendado 1200 × 630 px)"
            value={shareImageUrl}
            onChange={setShareImageUrl}
            previewFit="cover"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Después de responder</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Al terminar se muestra la pantalla final y, 1,5 segundos después, se lleva a la
            persona a esta dirección. No se aplica a los tests con puntaje.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endRedirectUrl">Redirigir a una URL</Label>
            <Input
              id="endRedirectUrl"
              type="url"
              value={endRedirectUrl}
              placeholder="https://tu-sitio.com/gracias"
              onChange={(event) => setEndRedirectUrl(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descalificación personalizada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Lo que ve quien llega a una opción marcada como «Descalificar al encuestado» en la
            lógica de una pregunta.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disqualifyMessage">Mensaje</Label>
            <Textarea
              id="disqualifyMessage"
              value={disqualifyMessage}
              maxLength={500}
              rows={2}
              placeholder="Con tus respuestas no podés continuar con esta encuesta."
              onChange={(event) => setDisqualifyMessage(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disqualifyRedirectUrl">Redirigir a una URL (opcional)</Label>
            <Input
              id="disqualifyRedirectUrl"
              type="url"
              value={disqualifyRedirectUrl}
              placeholder="https://tu-sitio.com/no-calificas"
              onChange={(event) => setDisqualifyRedirectUrl(event.target.value)}
            />
          </div>
          <div>
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
