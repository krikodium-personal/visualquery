import { cookies, headers } from "next/headers";

export type Lang = "es" | "en";
export const LANG_COOKIE = "vq-lang";

/** Language of the public site: the saved choice, else the browser's, else Spanish. */
export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (saved === "es" || saved === "en") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("en") ? "en" : "es";
}
