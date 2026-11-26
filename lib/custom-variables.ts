import { z } from "zod";

/** Custom variable: a URL parameter captured with each response. */
export const customVariableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(50, "El nombre admite hasta 50 caracteres")
    .regex(/^[A-Za-z0-9_-]+$/, "Usá letras, números, guion o guion bajo, sin espacios"),
  label: z.string().trim().max(250).optional(),
});

export type CustomVariable = z.infer<typeof customVariableSchema>;

export const MAX_CUSTOM_VARIABLES = 20;
export const MAX_VARIABLE_VALUE_LENGTH = 250;

/** Names that the public link already uses for something else. */
export const RESERVED_VARIABLE_NAMES = ["embed"];

export function parseCustomVariables(value: unknown): CustomVariable[] {
  const parsed = z.array(customVariableSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseResponseVariables(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") result[key] = entry;
  }
  return result;
}

/** Keeps only the defined variables present in the link, trimmed and length-capped. */
export function pickVariableValues(
  definitions: CustomVariable[],
  source: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const definition of definitions) {
    const raw = source[definition.name];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) result[definition.name] = value.slice(0, MAX_VARIABLE_VALUE_LENGTH);
  }
  return result;
}
