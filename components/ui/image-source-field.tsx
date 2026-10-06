"use client";

import { ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function ImageSourceField({
  id,
  label,
  value,
  onChange,
  previewFit = "contain",
  compact = false,
}: {
  id: string;
  label?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  previewFit?: "contain" | "cover";
  /** Smaller preview + denser layout for option rows. */
  compact?: boolean;
}) {
  const current = value?.trim() || null;
  const uploadedImage = current?.startsWith("data:image/") ?? false;

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

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => toast.error("No se pudo leer la imagen");
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}

      {current ? (
        <div className="relative overflow-hidden rounded-md border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={label ? `Vista previa de ${label.toLocaleLowerCase("es")}` : "Vista previa"}
            className={cn(
              "w-full",
              compact ? "h-24" : "h-32",
              previewFit === "cover" ? "object-cover" : "object-contain p-3",
            )}
          />
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
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor={`${id}-upload`}
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent",
            compact ? "h-8" : "h-9",
          )}
        >
          <ImageUp className="size-4" />
          Subir archivo
        </Label>
        {!compact ? (
          <span className="text-xs text-muted-foreground">PNG, JPG, WebP o GIF · máximo 2 MB</span>
        ) : null}
        <input
          id={`${id}-upload`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={handleUpload}
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o URL
        <span className="h-px flex-1 bg-border" />
      </div>
      <Input
        id={id}
        type="url"
        value={uploadedImage ? "" : current ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder={
          uploadedImage ? "Imagen subida desde archivo" : "https://tusitio.com/imagen.png"
        }
      />
    </div>
  );
}
