"use client";

import { useState, useTransition } from "react";
import { ImageUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SurveyRunner } from "@/components/survey-runtime/SurveyRunner";
import { updateSurveyDesign } from "@/actions/design";
import type { FlowEdge } from "@/lib/flow-engine";
import type { QuestionOption } from "@/lib/question-options";
import {
  BACKGROUND_IMAGE_SCOPE_OPTIONS,
  BUTTON_SHAPE_OPTIONS,
  DESIGN_DEFAULTS,
  FONT_OPTIONS,
  FONT_STACKS,
  LOGO_POSITION_OPTIONS,
  LOGO_SIZE_MAX,
  LOGO_SIZE_MIN,
  LOGO_SIZE_PRESETS,
  SURFACE_STYLE_OPTIONS,
  THEME_PRESETS,
  type BackgroundImageScope,
  type ButtonShape,
  type FontFamily,
  type LogoPosition,
  type ProgressDisplay,
  type SurfaceStyle,
  type SurveyDesign,
  type ThemePreset,
} from "@/lib/survey-design";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/lib/question-types";

type PreviewQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  options: QuestionOption[];
  required: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  selectionErrorMessage: string | null;
};

type FormState = SurveyDesign & { title: string; description: string | null };
type PreviewScreen = "cover" | "question" | "final";

const PREVIEW_SCREEN_OPTIONS: { value: PreviewScreen; label: string }[] = [
  { value: "cover", label: "Portada" },
  { value: "question", label: "Pregunta" },
  { value: "final", label: "Final" },
];

export function DesignForm({
  surveyId,
  initial,
  questions,
  edges,
  rootQuestionId,
}: {
  surveyId: string;
  initial: FormState;
  questions: PreviewQuestion[];
  edges: FlowEdge[];
  rootQuestionId: string | null;
}) {
  const [values, setValues] = useState<FormState>(initial);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("cover");
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const applyTheme = (themePreset: ThemePreset) => {
    const theme = THEME_PRESETS.find((option) => option.value === themePreset);
    if (!theme) return;
    setValues((previous) => ({
      ...previous,
      themePreset,
      themeColor: theme.themeColor,
      backgroundColor: theme.backgroundColor,
      fontFamily: theme.fontFamily,
      buttonShape: theme.buttonShape,
      surfaceStyle: theme.surfaceStyle,
    }));
  };

  const handleSave = () =>
    startTransition(async () => {
      try {
        await updateSurveyDesign(surveyId, {
          title: values.title,
          description: values.description ?? "",
          themePreset: values.themePreset,
          themeColor: values.themeColor,
          backgroundColor: values.backgroundColor,
          backgroundImageUrl: values.backgroundImageUrl ?? "",
          backgroundImageScope: values.backgroundImageScope,
          fontFamily: values.fontFamily,
          buttonShape: values.buttonShape,
          surfaceStyle: values.surfaceStyle,
          logoUrl: values.logoUrl ?? "",
          logoSize: values.logoSize,
          logoPosition: values.logoPosition,
          showProgress: values.showProgress,
          progressDisplay: values.progressDisplay,
          welcomeEnabled: values.welcomeEnabled,
          welcomeTitle: values.welcomeTitle ?? "",
          welcomeText: values.welcomeText ?? "",
          welcomeButtonLabel: values.welcomeButtonLabel ?? "",
          thankYouTitle: values.thankYouTitle ?? "",
          thankYouText: values.thankYouText ?? "",
        });
        toast.success("Diseño guardado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar el diseño");
      }
    });

  return (
    <div className="flex flex-col gap-4">
      {/* On a phone there's no room for both, so they become tabs. */}
      <div className="flex gap-1 rounded-lg border p-1 lg:hidden">
        {(
          [
            ["edit", "Edición"],
            ["preview", "Vista previa"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
              mobileTab === tab ? "bg-secondary font-medium" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
        <div
          className={cn(
            "flex-col gap-4",
            mobileTab === "edit" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">La encuesta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={values.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Se muestra debajo del título en la primera pregunta"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base">Barra de progreso</CardTitle>
                <p className="text-sm font-normal text-muted-foreground">
                  Mostrá el avance mientras se responde la encuesta.
                </p>
              </div>
              <Switch
                checked={values.showProgress}
                onCheckedChange={(value) => set("showProgress", value)}
                aria-label="Mostrar barra de progreso"
              />
            </CardHeader>
            {values.showProgress && (
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Label>Mostrar avance como</Label>
                  <Select
                    value={values.progressDisplay}
                    onValueChange={(value) =>
                      set("progressDisplay", value as ProgressDisplay)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value) =>
                          value === "questions" ? "Preguntas (1/10)" : "Porcentaje (10%)"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (10%)</SelectItem>
                      <SelectItem value="questions">Preguntas (1/10)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Carátula</CardTitle>
              <Switch
                checked={values.welcomeEnabled}
                onCheckedChange={(v) => set("welcomeEnabled", v)}
                aria-label="Mostrar carátula"
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="-mt-2 text-sm text-muted-foreground">
                La primera pantalla, antes de la primera pregunta: logo, título, una bajada
                explicativa y el botón para empezar.
              </p>
              {values.welcomeEnabled && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="welcomeTitle">Título</Label>
                    <Input
                      id="welcomeTitle"
                      value={values.welcomeTitle ?? ""}
                      onChange={(e) => set("welcomeTitle", e.target.value)}
                      placeholder={values.title}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="welcomeText">Bajada</Label>
                    <Textarea
                      id="welcomeText"
                      value={values.welcomeText ?? ""}
                      onChange={(e) => set("welcomeText", e.target.value)}
                      placeholder="De qué se trata la encuesta"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="welcomeButtonLabel">Texto del botón</Label>
                    <Input
                      id="welcomeButtonLabel"
                      value={values.welcomeButtonLabel ?? ""}
                      onChange={(e) => set("welcomeButtonLabel", e.target.value)}
                      placeholder={DESIGN_DEFAULTS.welcomeButtonLabel}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Marca</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ImageSourceField
                id="logoUrl"
                label="Logo"
                value={values.logoUrl}
                onChange={(value) => set("logoUrl", value)}
                previewFit="contain"
              />
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="logoSize">Tamaño del logo</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {values.logoSize} px
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {LOGO_SIZE_PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      size="sm"
                      variant={values.logoSize === preset.value ? "default" : "outline"}
                      className="h-auto min-h-8 whitespace-normal px-2 py-1 text-xs"
                      onClick={() => set("logoSize", preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <input
                  id="logoSize"
                  type="range"
                  min={LOGO_SIZE_MIN}
                  max={LOGO_SIZE_MAX}
                  step={1}
                  value={values.logoSize}
                  onChange={(event) => set("logoSize", Number(event.target.value))}
                  className="w-full accent-foreground"
                  aria-label="Ancho personalizado del logo"
                />
                <p className="text-xs text-muted-foreground">
                  Arrastrá el control para ajustar el ancho. La altura se escala proporcionalmente.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Posición del logo en las preguntas</Label>
                <Select
                  value={values.logoPosition}
                  onValueChange={(v) => set("logoPosition", v as LogoPosition)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v) => LOGO_POSITION_OPTIONS.find((o) => o.value === v)?.label ?? String(v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LOGO_POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apariencia</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div>
                  <Label>Temas</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Elegí una base visual y después personalizá sus colores, tipografía y superficies.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {THEME_PRESETS.map((theme) => {
                    const selected = values.themePreset === theme.value;
                    return (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => applyTheme(theme.value)}
                        aria-pressed={selected}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
                          selected && "border-foreground ring-1 ring-foreground",
                        )}
                      >
                        <span
                          aria-hidden
                          className="relative size-10 shrink-0 overflow-hidden rounded-md border"
                          style={{ backgroundColor: theme.backgroundColor }}
                        >
                          <span
                            className="absolute inset-x-2 bottom-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.themeColor }}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{theme.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {theme.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  id="themeColor"
                  label="Color principal"
                  value={values.themeColor}
                  onChange={(v) => set("themeColor", v)}
                />
                <ColorField
                  id="backgroundColor"
                  label="Fondo"
                  value={values.backgroundColor}
                  onChange={(v) => set("backgroundColor", v)}
                />
              </div>

              <ImageSourceField
                id="backgroundImageUrl"
                label="Imagen de fondo"
                value={values.backgroundImageUrl}
                onChange={(value) => set("backgroundImageUrl", value)}
                previewFit="cover"
              />

              <div className="flex flex-col gap-2">
                <Label>Mostrar la imagen de fondo</Label>
                <Select
                  value={values.backgroundImageScope}
                  onValueChange={(value) =>
                    set("backgroundImageScope", value as BackgroundImageScope)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) =>
                        BACKGROUND_IMAGE_SCOPE_OPTIONS.find(
                          (option) => option.value === value,
                        )?.label ?? String(value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUND_IMAGE_SCOPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Tipografía</Label>
                  <Select
                    value={values.fontFamily}
                    onValueChange={(v) => set("fontFamily", v as FontFamily)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                      {(v) => FONT_OPTIONS.find((o) => o.value === v)?.label ?? String(v)}
                    </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          style={{ fontFamily: FONT_STACKS[opt.value] }}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Forma de los botones</Label>
                  <Select
                    value={values.buttonShape}
                    onValueChange={(v) => set("buttonShape", v as ButtonShape)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                      {(v) => BUTTON_SHAPE_OPTIONS.find((o) => o.value === v)?.label ?? String(v)}
                    </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_SHAPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Estilo de los recuadros</Label>
                  <Select
                    value={values.surfaceStyle}
                    onValueChange={(value) => set("surfaceStyle", value as SurfaceStyle)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value) =>
                          SURFACE_STYLE_OPTIONS.find((option) => option.value === value)?.label ??
                          String(value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SURFACE_STYLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {values.surfaceStyle === "glass" && (
                    <p className="text-xs text-muted-foreground">
                      Material Apple con blur de 26 px, vibrancia, borde especular y sombra suave.
                    </p>
                  )}
                  {values.surfaceStyle === "blur" && (
                    <p className="text-xs text-muted-foreground">
                      Fondo transparente con desenfoque del contenido que queda detrás.
                    </p>
                  )}
                  {values.surfaceStyle === "transparent" && (
                    <p className="text-xs text-muted-foreground">
                      Deja ver el fondo a través del recuadro, sin desenfoque.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pantalla final</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="thankYouTitle">Título</Label>
                <Input
                  id="thankYouTitle"
                  value={values.thankYouTitle ?? ""}
                  onChange={(e) => set("thankYouTitle", e.target.value)}
                  placeholder={DESIGN_DEFAULTS.thankYouTitle}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="thankYouText">Texto</Label>
                <Textarea
                  id="thankYouText"
                  value={values.thankYouText ?? ""}
                  onChange={(e) => set("thankYouText", e.target.value)}
                  placeholder={DESIGN_DEFAULTS.thankYouText}
                />
              </div>
            </CardContent>
          </Card>

          <div>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar diseño"}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            mobileTab === "preview" ? "block" : "hidden",
            "lg:sticky lg:top-4 lg:block lg:self-start",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="hidden text-xs text-muted-foreground lg:block">Vista previa</p>
            <div className="flex w-full items-center gap-2 lg:w-auto">
              <Label className="shrink-0 text-xs" htmlFor="preview-screen">
                Pantalla
              </Label>
              <Select
                value={previewScreen}
                onValueChange={(value) => setPreviewScreen(value as PreviewScreen)}
              >
                <SelectTrigger id="preview-screen" className="w-full lg:w-40">
                  <SelectValue>
                    {(value) =>
                      PREVIEW_SCREEN_OPTIONS.find((option) => option.value === value)?.label ??
                      String(value)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PREVIEW_SCREEN_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border">
            {/* The real survey, driven by the values being edited. Remounted
                when the cover is toggled so it starts from the right screen. */}
            <div
              key={`${values.welcomeEnabled}-${previewScreen}`}
              className="flex h-[560px] flex-col overflow-y-auto"
            >
              <SurveyRunner
                preview
                previewScreen={previewScreen}
                title={values.title}
                description={values.description}
                questions={questions}
                edges={edges}
                rootQuestionId={rootQuestionId}
                design={values}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function ImageSourceField({
  id,
  label,
  value,
  onChange,
  previewFit,
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  previewFit: "contain" | "cover";
}) {
  const uploadedImage = value?.startsWith("data:image/") ?? false;

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
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {value && (
        <div className="relative overflow-hidden rounded-md border bg-muted/40">
          {/* The source can be an uploaded data image or an owner-provided URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={`Vista previa de ${label.toLocaleLowerCase("es")}`}
            className={cn(
              "h-32 w-full",
              previewFit === "cover" ? "object-cover" : "object-contain p-3",
            )}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute right-2 top-2"
            onClick={() => onChange(null)}
            aria-label={`Quitar ${label.toLocaleLowerCase("es")}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor={`${id}-upload`}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent"
        >
          <ImageUp className="size-4" />
          Subir archivo
        </Label>
        <span className="text-xs text-muted-foreground">PNG, JPG, WebP o GIF · máximo 2 MB</span>
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
        o ingresá una URL
        <span className="h-px flex-1 bg-border" />
      </div>
      <Input
        id={id}
        type="url"
        value={uploadedImage ? "" : value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder={uploadedImage ? "Imagen subida desde archivo" : "https://tusitio.com/imagen.png"}
      />
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent"
          aria-label={label}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}
