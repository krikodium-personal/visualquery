"use client";

import { useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const WEBP_QUALITIES = [0.85, 0.72, 0.58, 0.45] as const;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo codificar la imagen"));
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(blob);
  });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

/** Decode any accepted upload and re-encode as a WebP data URL for storage. */
async function fileToWebpDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar el lienzo de imagen");
    context.drawImage(bitmap, 0, 0);

    let lastBlob: Blob | null = null;
    for (const quality of WEBP_QUALITIES) {
      const blob = await canvasToWebpBlob(canvas, quality);
      if (!blob) continue;
      lastBlob = blob;
      if (blob.size <= MAX_IMAGE_BYTES) {
        return blobToDataUrl(blob);
      }
    }

    if (!lastBlob) {
      throw new Error("Tu navegador no puede guardar imágenes como WebP");
    }
    throw new Error("La imagen convertida supera los 2 MB");
  } finally {
    bitmap.close();
  }
}

export function ImageSourceField({
  id,
  label,
  value,
  onChange,
  previewFit = "contain",
  compact = false,
  videoAspect = false,
  framing,
}: {
  id: string;
  label?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  previewFit?: "contain" | "cover";
  /** Smaller preview + denser layout for option rows. */
  compact?: boolean;
  /** 16:9 preview (and empty placeholder) matching how the respondent sees it. */
  videoAspect?: boolean;
  /** When set, the preview can be dragged to frame the visible part, with a zoom slider. */
  framing?: {
    focusX?: number;
    focusY?: number;
    zoom?: number;
    onChange: (frame: { focusX: number; focusY: number; zoom: number }) => void;
  };
}) {
  const [converting, setConverting] = useState(false);
  const current = value?.trim() || null;
  const uploadedImage = current?.startsWith("data:image/") ?? false;

  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const frameX = framing?.focusX ?? 50;
  const frameY = framing?.focusY ?? 50;
  const frameZoom = framing?.zoom ?? 1;
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

  const handleFramePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!framing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, fx: frameX, fy: frameY };
  };
  const handleFramePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!framing || !start) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // Dragging right reveals the left side of the picture, like moving the image itself.
    const dx = ((event.clientX - start.x) / rect.width) * 100;
    const dy = ((event.clientY - start.y) / rect.height) * 100;
    framing.onChange({
      focusX: Math.round(clamp(start.fx - dx, 0, 100)),
      focusY: Math.round(clamp(start.fy - dy, 0, 100)),
      zoom: frameZoom,
    });
  };
  const endFrameDrag = () => {
    dragRef.current = null;
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error("Usá una imagen PNG, JPG, WebP o GIF");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("La imagen no puede superar los 2 MB");
      return;
    }

    setConverting(true);
    void fileToWebpDataUrl(file)
      .then((dataUrl) => {
        if (!dataUrl.startsWith("data:image/webp")) {
          throw new Error("El navegador no pudo guardar la imagen como WebP");
        }
        onChange(dataUrl);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "No se pudo convertir la imagen");
      })
      .finally(() => setConverting(false));
  };

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}

      {current ? (
        <div className="relative overflow-hidden rounded-md border bg-muted/40">
          <div
            className={cn(
              "overflow-hidden",
              framing && "cursor-grab touch-none select-none active:cursor-grabbing",
            )}
            onPointerDown={handleFramePointerDown}
            onPointerMove={handleFramePointerMove}
            onPointerUp={endFrameDrag}
            onPointerCancel={endFrameDrag}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={label ? `Vista previa de ${label.toLocaleLowerCase("es")}` : "Vista previa"}
              draggable={false}
              className={cn(
                "w-full",
                videoAspect ? "aspect-video" : compact ? "h-24" : "h-32",
                previewFit === "cover" ? "object-cover" : "object-contain p-3",
              )}
              style={
                framing
                  ? {
                      objectPosition: `${frameX}% ${frameY}%`,
                      transformOrigin: `${frameX}% ${frameY}%`,
                      transform: frameZoom === 1 ? undefined : `scale(${frameZoom})`,
                    }
                  : undefined
              }
            />
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute right-2 top-2"
            onClick={() => onChange(null)}
            aria-label={label ? `Quitar ${label.toLocaleLowerCase("es")}` : "Quitar imagen"}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : videoAspect ? (
        <div className="flex aspect-video items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
          Sin imagen
        </div>
      ) : null}

      {framing && current ? (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Arrastrá la imagen para encuadrarla</span>
          <div className="flex items-center gap-2">
            <span className="shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={frameZoom}
              onChange={(event) =>
                framing.onChange({
                  focusX: frameX,
                  focusY: frameY,
                  zoom: Number(event.target.value),
                })
              }
              aria-label="Zoom de la imagen"
              className="h-4 min-w-0 flex-1 cursor-pointer accent-foreground"
            />
            <button
              type="button"
              className="shrink-0 underline-offset-2 hover:underline"
              onClick={() => framing.onChange({ focusX: 50, focusY: 50, zoom: 1 })}
            >
              Restablecer
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor={`${id}-upload`}
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent",
            compact ? "h-8" : "h-9",
            converting && "pointer-events-none opacity-60",
          )}
        >
          <ImageUp className="size-4" />
          {converting ? "Convirtiendo…" : "Subir archivo"}
        </Label>
        {!compact ? (
          <span className="text-xs text-muted-foreground">
            PNG, JPG, WebP o GIF · se guarda como WebP · máximo 2 MB
          </span>
        ) : null}
        <input
          id={`${id}-upload`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          disabled={converting}
          onChange={handleUpload}
        />
      </div>

      {!compact && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          o URL
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      <Input
        id={id}
        type="url"
        value={uploadedImage ? "" : current ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder={
          uploadedImage
            ? "Imagen subida desde archivo"
            : compact
              ? "o pegá una URL de imagen"
              : "https://tusitio.com/imagen.png"
        }
      />
    </div>
  );
}
