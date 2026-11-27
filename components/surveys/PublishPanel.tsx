"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  togglePublish,
  updateCollectorOptions,
  updateCustomVariables,
  updateSlug,
} from "@/actions/surveys";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { SharingSettings, type SharingValues } from "@/components/surveys/SharingSettings";
import type { CustomVariable } from "@/lib/custom-variables";
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
  customVariables,
  surveyTitle,
  sharing,
}: {
  surveyId: string;
  slug: string;
  status: "draft" | "published" | "closed";
  questionCount: number;
  publicUrl: string;
  accessPassword: string | null;
  responseLimit: number | null;
  cutoffAt: string | null;
  customVariables: CustomVariable[];
  surveyTitle: string;
  sharing: SharingValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState(accessPassword ?? "");
  const [limit, setLimit] = useState(responseLimit !== null ? String(responseLimit) : "");
  const [cutoffLocal, setCutoffLocal] = useState(() => toDatetimeLocal(cutoffAt));

  const [variables, setVariables] = useState<{ name: string; label: string }[]>(
    customVariables.map((variable) => ({ name: variable.name, label: variable.label ?? "" })),
  );

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

  const published = status === "published";
  const noQuestions = questionCount === 0;
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState(slug);
  const linkPrefix = publicUrl.slice(0, publicUrl.length - slug.length);

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

  const saveSlug = () =>
    startTransition(async () => {
      try {
        const result = await updateSlug(surveyId, slugDraft);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setEditingSlug(false);
        toast.success("Link actualizado");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cambiar el link");
      }
    });

  const shareLinks = [
    { label: "Correo", href: `mailto:?subject=${encodeURIComponent(surveyTitle)}&body=${encodeURIComponent(publicUrl)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${surveyTitle} ${publicUrl}`)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(surveyTitle)}` },
  ];

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
                    Letras sin tildes, números y guiones; de 3 a 100 caracteres. Al cambiarlo, el
                    link anterior deja de funcionar.
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
                  <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copiar link">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variables personalizadas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Datos que viajan en el link y se guardan con cada respuesta, por ejemplo{" "}
                <code className="rounded bg-muted px-1">{publicUrl}?campania=mail1</code>. Aparecen
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
        </>
      )}

      <SharingSettings surveyId={surveyId} surveyTitle={surveyTitle} initial={sharing} />
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
