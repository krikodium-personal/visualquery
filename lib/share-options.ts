import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "El final del link necesita al menos 3 caracteres")
  .max(100, "El final del link admite hasta 100 caracteres")
  .regex(SLUG_PATTERN, "Usá letras sin tildes, números y guiones (sin espacios ni guiones al borde)");

/** Only http(s) targets: anything else (javascript:, data:) must never be a redirect. */
const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "La URL tiene que empezar con http:// o https://");

const optionalHttpUrl = z
  .union([httpUrl, z.literal("")])
  .transform((value) => (value === "" ? null : value));

export const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/;

const shareImage = z
  .string()
  .trim()
  .max(2_800_000, "La imagen supera el tamaño máximo permitido")
  .refine(
    (value) =>
      value === "" ||
      (/^https?:\/\//.test(value) && value.length <= 2000) ||
      DATA_IMAGE_PATTERN.test(value),
    "La imagen tiene que ser un archivo subido o una URL http(s)",
  )
  .transform((value) => (value === "" ? null : value));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Admite hasta ${max} caracteres`)
    .transform((value) => (value === "" ? null : value));

/** Survey-level link preview (shared by all collectors). */
export const sharingOptionsSchema = z.object({
  shareTitle: optionalText(120),
  shareDescription: optionalText(300),
  shareImageUrl: shareImage,
});

export type SharingOptionsInput = z.input<typeof sharingOptionsSchema>;

/** Per-collector access rules and end-of-survey behaviour. */
export const collectorOptionsSchema = z.object({
  accessPassword: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value === "" ? null : value)),
  responseLimit: z.number().int().positive().max(1_000_000).nullable(),
  cutoffAt: z.string().datetime().nullable(),
  endRedirectUrl: optionalHttpUrl,
  disqualifyMessage: optionalText(500),
  disqualifyRedirectUrl: optionalHttpUrl,
});

export type CollectorOptionsInput = z.input<typeof collectorOptionsSchema>;

export const collectorNameSchema = z
  .string()
  .trim()
  .min(1, "Poné un nombre para el recopilador")
  .max(80, "El nombre admite hasta 80 caracteres");
