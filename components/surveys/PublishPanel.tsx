"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { togglePublish, updateCollectorOptions } from "@/actions/surveys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PublishPanel({
  surveyId,
  slug,
  status,
  questionCount,
  publicUrl,
  accessPassword,
  responseLimit,
  cutoffAt,
}: {
  surveyId: string;
  slug: string;
  status: "draft" | "published" | "closed";
  questionCount: number;
  publicUrl: string;
  accessPassword: string | null;
  responseLimit: number | null;
  cutoffAt: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState(accessPassword ?? "");
  const [limit, setLimit] = useState(responseLimit !== null ? String(responseLimit) : "");
  const [cutoffLocal, setCutoffLocal] = useState(() => toDatetimeLocal(cutoffAt));

  const published = status === "published";
  const noQuestions = questionCount === 0;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicUrl)}`;

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

  const saveCollectorOptions = () =>
    startTransition(async () => {
      try {
        const parsedLimit = limit.trim() === "" ? null : Number(limit.replace(/\./g, "").replace(",", "."));
        if (limit.trim() !== "" && (!Number.isFinite(parsedLimit) || (parsedLimit ?? 0) < 1)) {
          toast.error("El límite de respuestas tiene que ser un número entero positivo");
          return;
        }
        await updateCollectorOptions(surveyId, {
          accessPassword: password.trim() || null,
          responseLimit: parsedLimit === null ? null : Math.floor(parsedLimit!),
          cutoffAt: cutoffLocal.trim() ? new Date(cutoffLocal).toISOString() : null,
        });
        toast.success("Opciones del recopilador guardadas");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron guardar las opciones");
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
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link para compartir</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
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
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium">Código QR</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Código QR de la encuesta"
                  width={160}
                  height={160}
                  className="rounded-md border bg-white p-2"
                />
                <p className="text-xs text-muted-foreground">
                  Escanealo para abrir el link público en el celular.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insertar en un sitio (embed)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Copiá este código en tu página web para mostrar la encuesta dentro de un iframe.
              </p>
              <textarea
                readOnly
                rows={4}
                className="w-full rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed"
                value={`<iframe src="${publicUrl}?embed=1" width="100%" height="720" style="border:0;border-radius:12px;max-width:640px;" title="Encuesta" loading="lazy"></iframe>`}
              />
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    const snippet = `<iframe src="${publicUrl}?embed=1" width="100%" height="720" style="border:0;border-radius:12px;max-width:640px;" title="Encuesta" loading="lazy"></iframe>`;
                    await navigator.clipboard.writeText(snippet);
                    toast.success("Código embed copiado");
                  }}
                >
                  <Copy className="size-3.5" />
                  Copiar código
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opciones del recopilador</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accessPassword">Contraseña de acceso</Label>
                <Input
                  id="accessPassword"
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Dejala vacía para acceso libre"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="responseLimit">Límite de respuestas</Label>
                <Input
                  id="responseLimit"
                  type="text"
                  inputMode="numeric"
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                  placeholder="Sin límite"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cutoffAt">Fecha/hora de corte</Label>
                <Input
                  id="cutoffAt"
                  type="datetime-local"
                  value={cutoffLocal}
                  onChange={(event) => setCutoffLocal(event.target.value)}
                />
              </div>
              <div>
                <Button onClick={saveCollectorOptions} disabled={isPending}>
                  {isPending ? "Guardando..." : "Guardar opciones"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
