import { z } from "zod";
import { languageCodeOf } from "@/lib/languages";

export const MAX_IMPORT_ROWS = 1000;

export const contactInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  language: z
    .string()
    .optional()
    .transform((value) => languageCodeOf(value)),
  custom1: z.string().trim().max(120).optional(),
  custom2: z.string().trim().max(120).optional(),
  custom3: z.string().trim().max(120).optional(),
});

export type ContactInput = z.input<typeof contactInputSchema>;

export type ContactRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  language: string | null;
  custom1: string | null;
  custom2: string | null;
  custom3: string | null;
  groupIds: string[];
};

/** Splits one CSV/TSV line respecting double quotes. */
function splitLine(line: string): string[] {
  const delimiter = line.includes("\t") ? "\t" : line.includes(";") && !line.includes(",") ? ";" : ",";
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

const norm = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

type ContactField = "email" | "firstName" | "lastName" | "language" | "custom1" | "custom2" | "custom3" | null;

/** Order used when the file has no header row. */
const DEFAULT_ORDER: ContactField[] = ["email", "firstName", "lastName", "language", "custom1", "custom2", "custom3"];

function fieldOfHeader(header: string): ContactField {
  const h = norm(header);
  if (/mail|correo/.test(h)) return "email";
  if (/^(nombre|first)/.test(h)) return "firstName";
  if (/^(apellido|last)/.test(h)) return "lastName";
  if (/idioma|language/.test(h)) return "language";
  const custom = h.match(/(?:datos personalizados|personalizado|custom)\D*([1-3])$/);
  if (custom) return `custom${custom[1]}` as ContactField;
  return null; // phone, other custom fields…: ignored
}

/**
 * Parses pasted/CSV text, one contact per line (comma, semicolon or tab separated).
 * With a header row (mentioning correo/email) columns are matched by name; without one the order is
 * correo, nombre, apellido, idioma, datos personalizados 1–3. Language is dropped unless the list
 * says it includes languages.
 */
export function parseContactsText(
  text: string,
  includesLanguage = true,
): { rows: ContactInput[]; invalid: number } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: ContactInput[] = [];
  let invalid = 0;
  let order = DEFAULT_ORDER;
  lines.forEach((line, index) => {
    const cells = splitLine(line);
    if (index === 0 && !cells.some((cell) => cell.includes("@")) && cells.some((c) => /mail|correo/i.test(c))) {
      order = cells.map(fieldOfHeader);
      return;
    }
    const raw: Record<string, string | undefined> = {};
    order.forEach((field, i) => {
      if (field && cells[i]) raw[field] = cells[i];
    });
    if (!includesLanguage) delete raw.language;
    const parsed = contactInputSchema.safeParse(raw);
    if (parsed.success) rows.push(parsed.data);
    else invalid += 1;
  });
  return { rows, invalid };
}
