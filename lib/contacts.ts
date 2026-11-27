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

/**
 * Parses pasted/CSV text: one contact per line, columns
 * email, nombre, apellido, idioma (comma, semicolon or tab separated). A header row is skipped.
 */
export function parseContactsText(text: string): { rows: ContactInput[]; invalid: number } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: ContactInput[] = [];
  let invalid = 0;
  lines.forEach((line, index) => {
    const cells = line.split(/[;,\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ""));
    if (index === 0 && !cells[0].includes("@") && /mail|correo/i.test(cells[0])) return;
    const parsed = contactInputSchema.safeParse({
      email: cells[0],
      firstName: cells[1] || undefined,
      lastName: cells[2] || undefined,
      language: cells[3] || undefined,
    });
    if (parsed.success) rows.push(parsed.data);
    else invalid += 1;
  });
  return { rows, invalid };
}
