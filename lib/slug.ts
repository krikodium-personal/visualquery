/** "Mi encuesta" -> "mi-encuesta-k3x9a": readable base plus a short random suffix. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "encuesta"}-${suffix}`;
}
