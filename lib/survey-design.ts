export type FontFamily =
  | "sans"
  | "system"
  | "helvetica"
  | "arial"
  | "verdana"
  | "tahoma"
  | "trebuchet"
  | "georgia"
  | "times"
  | "garamond"
  | "courier"
  | "lucida-console"
  | "serif"
  | "mono";
export type ButtonShape = "rounded" | "pill" | "square";
export type BackgroundImageScope = "cover" | "all";
export type ThemePreset =
  | "modern"
  | "classic"
  | "futuristic"
  | "minimal"
  | "editorial"
  | "warm"
  | "vibrant";
export type SurfaceStyle = "solid" | "transparent" | "blur" | "glass";
export type LogoPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** Everything the design step controls about how a survey looks and reads. */
export interface SurveyDesign {
  themePreset: ThemePreset;
  themeColor: string;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  backgroundImageScope: BackgroundImageScope;
  fontFamily: FontFamily;
  buttonShape: ButtonShape;
  surfaceStyle: SurfaceStyle;
  logoUrl: string | null;
  /** Rendered logo width in pixels. Height remains proportional. */
  logoSize: number;
  logoPosition: LogoPosition;
  /** The cover screen shown before the first question. */
  welcomeEnabled: boolean;
  welcomeTitle: string | null;
  welcomeText: string | null;
  welcomeButtonLabel: string | null;
  thankYouTitle: string | null;
  thankYouText: string | null;
}

export const DESIGN_DEFAULTS = {
  welcomeButtonLabel: "Empezar",
  thankYouTitle: "¡Gracias por responder!",
  thankYouText: "Tu respuesta fue registrada.",
} as const;

export const FONT_STACKS: Record<FontFamily, string> = {
  sans: "Helvetica, Arial, ui-sans-serif, system-ui, sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  helvetica: "Helvetica, Arial, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
  tahoma: "Tahoma, Geneva, sans-serif",
  trebuchet: "'Trebuchet MS', Helvetica, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  times: "'Times New Roman', Times, serif",
  garamond: "Garamond, Georgia, serif",
  courier: "'Courier New', Courier, monospace",
  "lucida-console": "'Lucida Console', Monaco, monospace",
  serif: "ui-serif, Georgia, Cambria, serif",
  mono: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
};

export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "system", label: "Sistema (San Francisco / Segoe UI)" },
  { value: "helvetica", label: "Helvetica" },
  { value: "arial", label: "Arial" },
  { value: "verdana", label: "Verdana" },
  { value: "tahoma", label: "Tahoma" },
  { value: "trebuchet", label: "Trebuchet MS" },
  { value: "georgia", label: "Georgia" },
  { value: "times", label: "Times New Roman" },
  { value: "garamond", label: "Garamond" },
  { value: "courier", label: "Courier New" },
  { value: "lucida-console", label: "Lucida Console" },
];

export function parseFontFamily(value: string): FontFamily {
  if (value === "sans") return "helvetica";
  if (value === "serif") return "georgia";
  if (value === "mono") return "courier";
  return value in FONT_STACKS ? (value as FontFamily) : "helvetica";
}

export type ThemePresetOption = {
  value: ThemePreset;
  label: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  fontFamily: FontFamily;
  buttonShape: ButtonShape;
  surfaceStyle: SurfaceStyle;
};

export const THEME_PRESETS: ThemePresetOption[] = [
  {
    value: "modern",
    label: "Moderno",
    description: "Limpio, claro y versátil",
    themeColor: "#2563EB",
    backgroundColor: "#F4F7FB",
    fontFamily: "system",
    buttonShape: "rounded",
    surfaceStyle: "solid",
  },
  {
    value: "classic",
    label: "Clásico",
    description: "Elegante y tradicional",
    themeColor: "#6B4F3B",
    backgroundColor: "#F4EFE7",
    fontFamily: "georgia",
    buttonShape: "rounded",
    surfaceStyle: "solid",
  },
  {
    value: "futuristic",
    label: "Futurista",
    description: "Oscuro, digital y preciso",
    themeColor: "#8B5CF6",
    backgroundColor: "#090B14",
    fontFamily: "system",
    buttonShape: "pill",
    surfaceStyle: "blur",
  },
  {
    value: "minimal",
    label: "Minimalista",
    description: "Neutro y sin distracciones",
    themeColor: "#171717",
    backgroundColor: "#FAFAFA",
    fontFamily: "helvetica",
    buttonShape: "square",
    surfaceStyle: "solid",
  },
  {
    value: "editorial",
    label: "Editorial",
    description: "Tipográfico y sofisticado",
    themeColor: "#9F1239",
    backgroundColor: "#FFF7ED",
    fontFamily: "garamond",
    buttonShape: "rounded",
    surfaceStyle: "solid",
  },
  {
    value: "warm",
    label: "Cálido",
    description: "Cercano, natural y amable",
    themeColor: "#C2410C",
    backgroundColor: "#FFF7E6",
    fontFamily: "trebuchet",
    buttonShape: "pill",
    surfaceStyle: "blur",
  },
  {
    value: "vibrant",
    label: "Vibrante",
    description: "Enérgico y contemporáneo",
    themeColor: "#DB2777",
    backgroundColor: "#FDF2F8",
    fontFamily: "verdana",
    buttonShape: "pill",
    surfaceStyle: "blur",
  },
];

export function parseThemePreset(value: string): ThemePreset {
  return THEME_PRESETS.some((theme) => theme.value === value)
    ? (value as ThemePreset)
    : "modern";
}

export const SURFACE_STYLE_OPTIONS: { value: SurfaceStyle; label: string }[] = [
  { value: "solid", label: "Sólido" },
  { value: "transparent", label: "Transparente" },
  { value: "blur", label: "Transparente con blur" },
  { value: "glass", label: "Glass · Apple" },
];

export const LOGO_SIZE_MIN = 40;
export const LOGO_SIZE_MAX = 240;
export const LOGO_SIZE_DEFAULT = 120;

export const LOGO_SIZE_PRESETS = [
  { value: 48, label: "Mínimo" },
  { value: 72, label: "Chico" },
  { value: 120, label: "Mediano" },
  { value: 168, label: "Grande" },
  { value: 220, label: "Extra grande" },
] as const;

export function parseLogoSize(value: number): number {
  return Number.isFinite(value)
    ? Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, Math.round(value)))
    : LOGO_SIZE_DEFAULT;
}

export function parseSurfaceStyle(value: string): SurfaceStyle {
  return value === "glass" || value === "blur" || value === "transparent" ? value : "solid";
}

export const BUTTON_SHAPE_OPTIONS: { value: ButtonShape; label: string }[] = [
  { value: "rounded", label: "Redondeado" },
  { value: "pill", label: "Pill" },
  { value: "square", label: "Cuadrado" },
];

export const BACKGROUND_IMAGE_SCOPE_OPTIONS: {
  value: BackgroundImageScope;
  label: string;
}[] = [
  { value: "cover", label: "Sólo en la portada" },
  { value: "all", label: "En todas las pantallas" },
];

export function parseBackgroundImageScope(value: string): BackgroundImageScope {
  return value === "cover" ? "cover" : "all";
}

/** Border radius applied to every button and selectable option. */
export const BUTTON_SHAPE_CLASS: Record<ButtonShape, string> = {
  rounded: "rounded-md",
  pill: "rounded-full",
  square: "rounded-none",
};

export function parseButtonShape(value: string): ButtonShape {
  return value === "pill" || value === "square" ? value : "rounded";
}

export const LOGO_POSITION_OPTIONS: { value: LogoPosition; label: string }[] = [
  { value: "top-left", label: "Arriba · izquierda" },
  { value: "top-center", label: "Arriba · centro" },
  { value: "top-right", label: "Arriba · derecha" },
  { value: "bottom-left", label: "Abajo · izquierda" },
  { value: "bottom-center", label: "Abajo · centro" },
  { value: "bottom-right", label: "Abajo · derecha" },
];

export function parseLogoPosition(value: string): LogoPosition {
  return LOGO_POSITION_OPTIONS.some((o) => o.value === value)
    ? (value as LogoPosition)
    : "top-center";
}

/** Splits "top-center" into the flex classes that place the small logo. */
export function logoPlacement(position: LogoPosition): {
  atTop: boolean;
  alignClass: string;
} {
  const [vertical, horizontal] = position.split("-");
  const alignClass =
    horizontal === "left" ? "justify-start" : horizontal === "right" ? "justify-end" : "justify-center";
  return { atTop: vertical === "top", alignClass };
}

/**
 * Picks black or white text for a background, so a chosen theme colour never
 * ends up with unreadable label on top of it.
 */
export function readableTextOn(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (full.length !== 6) return "#ffffff";

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Perceived brightness (ITU-R BT.601)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? "#000000" : "#ffffff";
}
