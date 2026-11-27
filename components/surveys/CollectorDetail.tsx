"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, ExternalLink, Pencil } from "lucide-react";
import {
  renameCollector,
  setCollectorOpen,
  updateCollectorOptions,
  updateCollectorSlug,
} from "@/actions/collectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CollectorDetailValues = {
  id: string;
  name: string;
  slug: string;
  open: boolean;
  responseCount: number;
  accessPassword: string | null;
  responseLimit: number | null;
  cutoffAt: string | null;
  endRedirectUrl: string | null;
  disqualifyMessage: string | null;
  disqualifyRedirectUrl: string | null;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** One collector: its link (edit, share, QR, embed) and its own access and ending rules. */
export function CollectorDetail({
  surveyId,
  surveyTitle,
  surveyOpen,
  origin,
  collector,
}: {
  surveyId: string;
  surveyTitle: string;
  surveyOpen: boolean;
  origin: string;
  collector: CollectorDetailValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { slug } = collector;
  const publicUrl = `${origin}/s/${slug}`;

  const [name, setName] = useState(collector.name);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState(slug);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [password, setPassword] = useState(collector.accessPassword ?? "");
  const [limit, setLimit] = useState(collector.responseLimit !== null ? String(collector.responseLimit) : "");
  const [cutoffLocal, setCutoffLocal] = useState(() => toDatetimeLocal(collector.cutoffAt));
  const [endRedirectUrl, setEndRedirectUrl] = useState(collector.endRedirectUrl ?? "");
  const [disqualifyMessage, setDisqualifyMessage] = useState(collector.disqualifyMessage ?? "");
  const [disqualifyRedirectUrl, setDisqualifyRedirectUrl] = useState(collector.disqualifyRedirectUrl ?? "");

  const linkPrefix = `${origin}/s/`;
  const embedSnippet = `<iframe src="${publicUrl}?embed=1" width="100%" height="720" style="border:0;border-radius:12px;max-width:640px;" title="Encuesta" loading="lazy"></iframe>`;

  // The QR is drawn in the browser, so the survey link never goes to a third party.
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(publicUrl, { width: 640, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const shareLinks = [
    { label: "Correo", href: `mailto:?subject=${encodeURIComponent(surveyTitle)}&body=${encodeURIComponent(publicUrl)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${surveyTitle} ${publicUrl}`)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(surveyTitle)}` },
  ];

  const copy = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const run = (action: () => Promise<{ error?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(success);
        after?.();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });

  const saveName = () => {
    if (name.trim() === collector.name) return;
    run(() => renameCollector(collector.id, name), "Nombre actualizado");
  };

  const saveSlug = () =>
    run(() => updateCollectorSlug(collector.id, slugDraft), "Link actualizado", () =>
      setEditingSlug(false),
    );

  const saveOptions = () => {
    const parsedLimit = limit.trim() === "" ? null : Number(limit.replace(/\./g, "").replace(",", "."));
    if (limit.trim() !== "" && (!Number.isFinite(parsedLimit) || (parsedLimit ?? 0) < 1)) {
      toast.error("El límite de respuestas tiene que ser un número entero positivo");
      return;
    }
    run(
      () =>
        updateCollectorOptions(collector.id, {
          accessPassword: password,
          responseLimit: parsedLimit === null ? null : Math.floor(parsedLimit),
          cutoffAt: cutoffLocal.trim() ? new Date(cutoffLocal).toISOString() : null,
          endRedirectUrl,
          disqualifyMessage,
          disqualifyRedirectUrl,
        }),
      "Opciones guardadas",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/surveys/${surveyId}/publish`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver a todos los recopiladores
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="collector-name">Nombre del recopilador</Label>
            <div className="flex gap-2">
              <Input
                id="collector-name"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                onBlur={saveName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                }}
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant={collector.open ? "secondary" : "outline"}>
              {collector.open ? "Abierto" : "Cerrado"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(
                  () => setCollectorOpen(collector.id, !collector.open),
                  collector.open ? "Recopilador cerrado" : "Recopilador abierto",
                )
              }
            >
              {collector.open ? "Cerrar" : "Abrir"}
            </Button>
          </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {collector.responseCount} {collector.responseCount === 1 ? "respuesta" : "respuestas"} por este
          recopilador.
          {!surveyOpen ? " La encuesta no está abierta: este link todavía no acepta respuestas." : ""}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Link para compartir</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {editingSlug ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{linkPrefix}</span>
                <Input
                  value={slugDraft}
                  maxLength={100}
                  className="font-mono text-xs"
                  aria-label="Final del link"
                  onChange={(event) => setSlugDraft(event.target.value.toLowerCase().replace(/\s/g, "-"))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Letras sin tildes, números y guiones; de 3 a 100 caracteres. Al cambiarlo, el link
                anterior deja de funcionar.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSlug} disabled={isPending}>
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingSlug(false);
                    setSlugDraft(slug);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(publicUrl, "Link copiado")} aria-label="Copiar link">
                <Copy className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEditingSlug(true)}
                aria-label="Editar el final del link"
              >
                <Pencil className="size-4" />
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
          )}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Compartir</p>
            <div className="flex flex-wrap gap-2">
              {shareLinks.map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href={item.href} target="_blank" rel="noreferrer" />}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium">Código QR</p>
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt="Código QR de la encuesta"
                width={160}
                height={160}
                className="rounded-md border bg-white p-2"
              />
            ) : (
              <div className="size-[160px] rounded-md border bg-muted/30" />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={!qrDataUrl}
                nativeButton={false}
                render={<a href={qrDataUrl ?? "#"} download={`qr-${slug}.png`} />}
              >
                <Download className="size-4" /> Descargar PNG
              </Button>
              <p className="text-xs text-muted-foreground">
                Escanealo para abrir el link público en el celular.
              </p>
            </div>
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
            value={embedSnippet}
          />
          <div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => copy(embedSnippet, "Código embed copiado")}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endRedirectUrl">Después de responder: redirigir a una URL</Label>
            <Input
              id="endRedirectUrl"
              type="url"
              value={endRedirectUrl}
              placeholder="https://tu-sitio.com/gracias"
              onChange={(event) => setEndRedirectUrl(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se muestra la pantalla final y 1,5 segundos después se lleva a la persona a esta
              dirección. No se aplica a los tests con puntaje.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disqualifyMessage">Descalificación: mensaje</Label>
            <Textarea
              id="disqualifyMessage"
              value={disqualifyMessage}
              maxLength={500}
              rows={2}
              placeholder="Con tus respuestas no podés continuar con esta encuesta."
              onChange={(event) => setDisqualifyMessage(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lo ve quien llega a una opción marcada como «Descalificar al encuestado» en la lógica
              de una pregunta.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disqualifyRedirectUrl">Descalificación: redirigir a una URL (opcional)</Label>
            <Input
              id="disqualifyRedirectUrl"
              type="url"
              value={disqualifyRedirectUrl}
              placeholder="https://tu-sitio.com/no-calificas"
              onChange={(event) => setDisqualifyRedirectUrl(event.target.value)}
            />
          </div>
          <div>
            <Button onClick={saveOptions} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar opciones"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
